
-- 1. Sign-up starts -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_signup_starts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  referrer_tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_hash text,
  completed_tenant_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_signup_starts TO authenticated;
GRANT ALL ON public.referral_signup_starts TO service_role;

ALTER TABLE public.referral_signup_starts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all signup starts"
ON public.referral_signup_starts FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Churches view their own signup starts"
ON public.referral_signup_starts FOR SELECT TO authenticated
USING (referrer_tenant_id = public.get_user_tenant_id(auth.uid())
       AND public.is_approved_tenant_user(auth.uid(), referrer_tenant_id));

CREATE INDEX IF NOT EXISTS idx_referral_starts_tenant_date
  ON public.referral_signup_starts (referrer_tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_starts_code_visitor
  ON public.referral_signup_starts (code, visitor_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_referral_signup_start(_code text, _visitor_hash text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code_up text;
  _tenant uuid;
  _recent int;
BEGIN
  _code_up := upper(trim(coalesce(_code, '')));
  IF _code_up = '' OR length(_code_up) > 32 THEN RETURN false; END IF;

  SELECT tenant_id INTO _tenant FROM public.referral_codes
  WHERE code = _code_up AND is_active = true;
  IF _tenant IS NULL THEN RETURN false; END IF;

  IF _visitor_hash IS NOT NULL THEN
    SELECT COUNT(*) INTO _recent FROM public.referral_signup_starts
    WHERE code = _code_up AND visitor_hash = _visitor_hash
      AND created_at > now() - interval '24 hours';
    IF _recent > 0 THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.referral_signup_starts (code, referrer_tenant_id, visitor_hash)
  VALUES (_code_up, _tenant, left(coalesce(_visitor_hash, ''), 64));
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_signup_start(text, text) TO anon, authenticated;

-- 2. Attribution model --------------------------------------------------
INSERT INTO public.platform_settings (setting_key, setting_value, setting_category, description)
VALUES ('referral_attribution_model', '"last_click"'::jsonb, 'referrals',
        'Which referral click gets credit for a sign-up: first_click or last_click')
ON CONFLICT (setting_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_referral_attribution_model()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN (setting_value #>> '{}') = 'first_click' THEN 'first_click' ELSE 'last_click' END
  FROM public.platform_settings WHERE setting_key = 'referral_attribution_model'
  UNION ALL SELECT 'last_click'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_attribution_model() TO anon, authenticated;

-- Resolve which code should be credited for a visitor
CREATE OR REPLACE FUNCTION public.get_attributed_referral_code(_visitor_hash text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _model text;
  _code text;
BEGIN
  IF _visitor_hash IS NULL OR _visitor_hash = '' THEN RETURN NULL; END IF;
  _model := public.get_referral_attribution_model();

  IF _model = 'first_click' THEN
    SELECT code INTO _code FROM public.referral_clicks
    WHERE visitor_hash = _visitor_hash AND created_at > now() - interval '30 days'
    ORDER BY created_at ASC LIMIT 1;
  ELSE
    SELECT code INTO _code FROM public.referral_clicks
    WHERE visitor_hash = _visitor_hash AND created_at > now() - interval '30 days'
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  RETURN _code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_attributed_referral_code(text) TO anon, authenticated;

-- Honour the attribution model when marking a click converted
CREATE OR REPLACE FUNCTION public.mark_referral_click_converted(_code text, _visitor_hash text, _tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _code_up text;
  _age interval;
  _model text;
BEGIN
  _code_up := upper(trim(coalesce(_code, '')));
  IF _code_up = '' OR _tenant_id IS NULL THEN RETURN false; END IF;

  SELECT now() - created_at INTO _age FROM public.tenants WHERE id = _tenant_id;
  IF _age IS NULL OR _age > interval '15 minutes' THEN RETURN false; END IF;

  _model := public.get_referral_attribution_model();

  UPDATE public.referral_signup_starts
  SET completed_tenant_id = _tenant_id, completed_at = now()
  WHERE id = (
    SELECT id FROM public.referral_signup_starts
    WHERE code = _code_up
      AND (visitor_hash = _visitor_hash OR _visitor_hash IS NULL)
      AND completed_tenant_id IS NULL
    ORDER BY created_at DESC LIMIT 1
  );

  UPDATE public.referral_clicks
  SET converted_tenant_id = _tenant_id, converted_at = now()
  WHERE id = (
    SELECT id FROM public.referral_clicks
    WHERE code = _code_up
      AND (visitor_hash = _visitor_hash OR _visitor_hash IS NULL)
      AND converted_tenant_id IS NULL
    ORDER BY (CASE WHEN _model = 'first_click' THEN created_at END) ASC NULLS LAST,
             created_at DESC
    LIMIT 1
  );

  RETURN FOUND;
END;
$$;

-- 3. Anomaly alerts -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_anomaly_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_anomaly_alerts TO authenticated;
GRANT UPDATE ON public.referral_anomaly_alerts TO authenticated;
GRANT ALL ON public.referral_anomaly_alerts TO service_role;

ALTER TABLE public.referral_anomaly_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage referral alerts"
ON public.referral_anomaly_alerts FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Churches view their own referral alerts"
ON public.referral_anomaly_alerts FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid())
       AND public.is_approved_tenant_user(auth.uid(), tenant_id));

CREATE INDEX IF NOT EXISTS idx_referral_alerts_status
  ON public.referral_anomaly_alerts (status, detected_at DESC);

CREATE TRIGGER trg_referral_alerts_updated_at
BEFORE UPDATE ON public.referral_anomaly_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.detect_referral_anomalies(_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _created int := 0;
  _r record;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  _days := GREATEST(1, LEAST(coalesce(_days, 7), 90));

  -- a) high clicks, low conversion
  FOR _r IN
    SELECT rc.tenant_id, rc.code,
           COUNT(c.id) AS clicks,
           COUNT(c.id) FILTER (WHERE c.converted_tenant_id IS NOT NULL) AS conv
    FROM public.referral_codes rc
    JOIN public.referral_clicks c ON c.referrer_tenant_id = rc.tenant_id
     AND c.created_at > now() - (_days || ' days')::interval
    GROUP BY rc.tenant_id, rc.code
    HAVING COUNT(c.id) >= 25
       AND COUNT(c.id) FILTER (WHERE c.converted_tenant_id IS NOT NULL) = 0
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.referral_anomaly_alerts
                   WHERE tenant_id = _r.tenant_id AND alert_type = 'high_clicks_no_conversion'
                     AND status = 'open' AND detected_at > now() - interval '24 hours') THEN
      INSERT INTO public.referral_anomaly_alerts (tenant_id, code, alert_type, severity, details)
      VALUES (_r.tenant_id, _r.code, 'high_clicks_no_conversion', 'high',
              jsonb_build_object('clicks', _r.clicks, 'conversions', _r.conv, 'window_days', _days));
      _created := _created + 1;
    END IF;
  END LOOP;

  -- b) repeated clicks from the same visitor
  FOR _r IN
    SELECT referrer_tenant_id AS tenant_id, code, visitor_hash, COUNT(*) AS clicks
    FROM public.referral_clicks
    WHERE created_at > now() - (_days || ' days')::interval AND visitor_hash <> ''
    GROUP BY referrer_tenant_id, code, visitor_hash
    HAVING COUNT(*) >= 8
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.referral_anomaly_alerts
                   WHERE tenant_id = _r.tenant_id AND alert_type = 'repeated_visitor_clicks'
                     AND status = 'open' AND detected_at > now() - interval '24 hours') THEN
      INSERT INTO public.referral_anomaly_alerts (tenant_id, code, alert_type, severity, details)
      VALUES (_r.tenant_id, _r.code, 'repeated_visitor_clicks', 'medium',
              jsonb_build_object('clicks', _r.clicks, 'window_days', _days));
      _created := _created + 1;
    END IF;
  END LOOP;

  -- c) sudden click spike in the last 24h
  FOR _r IN
    SELECT rc.tenant_id, rc.code,
           COUNT(*) FILTER (WHERE c.created_at > now() - interval '24 hours') AS recent,
           COUNT(*) FILTER (WHERE c.created_at <= now() - interval '24 hours') AS older
    FROM public.referral_codes rc
    JOIN public.referral_clicks c ON c.referrer_tenant_id = rc.tenant_id
     AND c.created_at > now() - interval '30 days'
    GROUP BY rc.tenant_id, rc.code
  LOOP
    IF _r.recent >= 20 AND _r.recent > (COALESCE(_r.older, 0)::numeric / 29.0) * 5 THEN
      IF NOT EXISTS (SELECT 1 FROM public.referral_anomaly_alerts
                     WHERE tenant_id = _r.tenant_id AND alert_type = 'click_spike'
                       AND status = 'open' AND detected_at > now() - interval '24 hours') THEN
        INSERT INTO public.referral_anomaly_alerts (tenant_id, code, alert_type, severity, details)
        VALUES (_r.tenant_id, _r.code, 'click_spike', 'medium',
                jsonb_build_object('clicks_last_24h', _r.recent, 'clicks_prior_29d', _r.older));
        _created := _created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN _created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_referral_anomalies(integer) TO authenticated;

-- 4. Funnel report ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_referral_funnel(
  _start timestamptz,
  _end timestamptz,
  _tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(
  bucket date,
  tenant_id uuid,
  tenant_name text,
  code text,
  clicks bigint,
  signup_starts bigint,
  signups bigint,
  qualified bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_super boolean;
  _scope uuid;
BEGIN
  _is_super := public.is_super_admin(auth.uid());
  _scope := _tenant_id;

  IF NOT _is_super THEN
    _scope := public.get_user_tenant_id(auth.uid());
    IF _scope IS NULL OR NOT public.is_approved_tenant_user(auth.uid(), _scope) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(date_trunc('day', _start), date_trunc('day', _end), interval '1 day')::date AS d
  ),
  codes AS (
    SELECT rc.tenant_id, rc.code, t.name
    FROM public.referral_codes rc
    JOIN public.tenants t ON t.id = rc.tenant_id
    WHERE (_scope IS NULL OR rc.tenant_id = _scope)
  ),
  base AS (
    SELECT d.d, c.tenant_id, c.name, c.code FROM days d CROSS JOIN codes c
  )
  SELECT
    b.d,
    b.tenant_id,
    b.name,
    b.code,
    COALESCE((SELECT COUNT(*) FROM public.referral_clicks x
              WHERE x.referrer_tenant_id = b.tenant_id AND x.created_at::date = b.d), 0),
    COALESCE((SELECT COUNT(*) FROM public.referral_signup_starts s
              WHERE s.referrer_tenant_id = b.tenant_id AND s.created_at::date = b.d), 0),
    COALESCE((SELECT COUNT(*) FROM public.referrals r
              WHERE r.referrer_tenant_id = b.tenant_id AND r.created_at::date = b.d), 0),
    COALESCE((SELECT COUNT(*) FROM public.referrals r
              WHERE r.referrer_tenant_id = b.tenant_id AND r.status IN ('qualified','rewarded')
                AND r.created_at::date = b.d), 0)
  FROM base b
  ORDER BY b.d, b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_funnel(timestamptz, timestamptz, uuid) TO authenticated;
