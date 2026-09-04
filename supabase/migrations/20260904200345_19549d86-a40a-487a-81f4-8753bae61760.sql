CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  referrer_tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_hash text,
  landing_path text,
  referrer_url text,
  user_agent text,
  converted_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_clicks_tenant ON public.referral_clicks (referrer_tenant_id, created_at DESC);
CREATE INDEX idx_referral_clicks_code ON public.referral_clicks (code, visitor_hash, created_at DESC);

GRANT SELECT ON public.referral_clicks TO authenticated;
GRANT ALL ON public.referral_clicks TO service_role;

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins view own referral clicks"
ON public.referral_clicks FOR SELECT TO authenticated
USING (
  referrer_tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.is_approved_tenant_user(auth.uid(), referrer_tenant_id)
);

CREATE POLICY "Super admins view all referral clicks"
ON public.referral_clicks FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.record_referral_click(
  _code text,
  _visitor_hash text DEFAULT NULL,
  _landing_path text DEFAULT NULL,
  _referrer_url text DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_up text;
  _tenant uuid;
  _recent int;
BEGIN
  _code_up := upper(trim(coalesce(_code, '')));
  IF _code_up = '' OR length(_code_up) > 32 THEN
    RETURN false;
  END IF;

  SELECT tenant_id INTO _tenant
  FROM public.referral_codes
  WHERE code = _code_up AND is_active = true;

  IF _tenant IS NULL THEN
    RETURN false;
  END IF;

  -- de-duplicate: one click per visitor per code per 24h
  IF _visitor_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO _recent
    FROM public.referral_clicks
    WHERE code = _code_up
      AND visitor_hash = _visitor_hash
      AND created_at > now() - interval '24 hours';
    IF _recent > 0 THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO public.referral_clicks (code, referrer_tenant_id, visitor_hash, landing_path, referrer_url, user_agent)
  VALUES (_code_up, _tenant, left(coalesce(_visitor_hash, ''), 64), left(coalesce(_landing_path, ''), 200), left(coalesce(_referrer_url, ''), 300), left(coalesce(_user_agent, ''), 300));

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_click(text, text, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_referral_click_converted(
  _code text,
  _visitor_hash text,
  _tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _code_up text;
  _age interval;
BEGIN
  _code_up := upper(trim(coalesce(_code, '')));
  IF _code_up = '' OR _tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT now() - created_at INTO _age FROM public.tenants WHERE id = _tenant_id;
  IF _age IS NULL OR _age > interval '15 minutes' THEN
    RETURN false;
  END IF;

  UPDATE public.referral_clicks
  SET converted_tenant_id = _tenant_id, converted_at = now()
  WHERE id = (
    SELECT id FROM public.referral_clicks
    WHERE code = _code_up
      AND (visitor_hash = _visitor_hash OR _visitor_hash IS NULL)
      AND converted_tenant_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_referral_click_converted(text, text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_tenant_referral_click_stats(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clicks int;
  _visitors int;
  _conversions int;
  _last timestamptz;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.is_approved_tenant_user(auth.uid(), _tenant_id)) THEN
    RETURN jsonb_build_object('clicks', 0, 'unique_visitors', 0, 'conversions', 0, 'conversion_rate', 0, 'last_click_at', NULL);
  END IF;

  SELECT COUNT(*), COUNT(DISTINCT visitor_hash), COUNT(*) FILTER (WHERE converted_tenant_id IS NOT NULL), MAX(created_at)
  INTO _clicks, _visitors, _conversions, _last
  FROM public.referral_clicks
  WHERE referrer_tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'clicks', COALESCE(_clicks, 0),
    'unique_visitors', COALESCE(_visitors, 0),
    'conversions', COALESCE(_conversions, 0),
    'conversion_rate', CASE WHEN COALESCE(_clicks, 0) = 0 THEN 0 ELSE round((_conversions::numeric / _clicks) * 100, 1) END,
    'last_click_at', _last
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_referral_click_stats(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_click_leaderboard()
RETURNS TABLE(
  tenant_id uuid,
  tenant_name text,
  code text,
  clicks bigint,
  unique_visitors bigint,
  signups bigint,
  qualified bigint,
  conversion_rate numeric,
  last_click_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rc.tenant_id,
    t.name,
    rc.code,
    COALESCE(c.clicks, 0),
    COALESCE(c.unique_visitors, 0),
    COALESCE(r.signups, 0),
    COALESCE(r.qualified, 0),
    CASE WHEN COALESCE(c.clicks, 0) = 0 THEN 0
         ELSE round((COALESCE(r.signups, 0)::numeric / c.clicks) * 100, 1) END,
    c.last_click_at
  FROM public.referral_codes rc
  JOIN public.tenants t ON t.id = rc.tenant_id
  LEFT JOIN (
    SELECT referrer_tenant_id, COUNT(*) AS clicks, COUNT(DISTINCT visitor_hash) AS unique_visitors, MAX(created_at) AS last_click_at
    FROM public.referral_clicks GROUP BY referrer_tenant_id
  ) c ON c.referrer_tenant_id = rc.tenant_id
  LEFT JOIN (
    SELECT referrer_tenant_id, COUNT(*) AS signups, COUNT(*) FILTER (WHERE status IN ('qualified','rewarded')) AS qualified
    FROM public.referrals GROUP BY referrer_tenant_id
  ) r ON r.referrer_tenant_id = rc.tenant_id
  WHERE public.is_super_admin(auth.uid())
  ORDER BY COALESCE(r.signups, 0) DESC, COALESCE(c.clicks, 0) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_click_leaderboard() TO authenticated;