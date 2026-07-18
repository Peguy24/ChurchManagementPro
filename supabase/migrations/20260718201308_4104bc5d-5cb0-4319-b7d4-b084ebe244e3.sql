
-- ============ 1. BROADCASTS ============
CREATE TABLE public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_html text NOT NULL,
  cta_label text,
  cta_url text,
  delivery text NOT NULL DEFAULT 'inbox' CHECK (delivery IN ('banner','inbox','both')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','error')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  audience_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage broadcasts" ON public.broadcasts FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Authenticated read active broadcasts" ON public.broadcasts FOR SELECT
  USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE TRIGGER broadcasts_updated_at BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.broadcast_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.broadcast_reads TO authenticated;
GRANT ALL ON public.broadcast_reads TO service_role;
ALTER TABLE public.broadcast_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own broadcast reads" ON public.broadcast_reads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Match audience helper
CREATE OR REPLACE FUNCTION public.matches_broadcast_audience(_tenant_id uuid, _rules jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _sub record;
  _tenant record;
  _trial_day int;
  _member_count int;
BEGIN
  IF _rules IS NULL OR _rules = '{}'::jsonb THEN RETURN true; END IF;
  IF _tenant_id IS NULL THEN RETURN false; END IF;

  SELECT * INTO _sub FROM public.tenant_subscriptions WHERE tenant_id = _tenant_id;
  SELECT * INTO _tenant FROM public.tenants WHERE id = _tenant_id;

  -- subscription_tier
  IF _rules ? 'subscription_tier' AND jsonb_array_length(_rules->'subscription_tier') > 0 THEN
    IF _sub.plan IS NULL OR NOT (_rules->'subscription_tier' ? _sub.plan::text) THEN RETURN false; END IF;
  END IF;

  -- subscription_status
  IF _rules ? 'subscription_status' AND jsonb_array_length(_rules->'subscription_status') > 0 THEN
    IF _sub.status IS NULL OR NOT (_rules->'subscription_status' ? _sub.status::text) THEN RETURN false; END IF;
  END IF;

  -- trial_day_range (day since current_period_start)
  IF _rules ? 'trial_day_range' THEN
    IF _sub.status::text <> 'trial' THEN RETURN false; END IF;
    _trial_day := GREATEST(0, EXTRACT(DAY FROM (now() - _sub.current_period_start))::int);
    IF (_rules->'trial_day_range'->>'min') IS NOT NULL AND _trial_day < (_rules->'trial_day_range'->>'min')::int THEN RETURN false; END IF;
    IF (_rules->'trial_day_range'->>'max') IS NOT NULL AND _trial_day > (_rules->'trial_day_range'->>'max')::int THEN RETURN false; END IF;
  END IF;

  -- country
  IF _rules ? 'country' AND jsonb_array_length(_rules->'country') > 0 THEN
    IF _tenant.country IS NULL OR NOT (_rules->'country' ? _tenant.country) THEN RETURN false; END IF;
  END IF;

  -- member_count_range
  IF _rules ? 'member_count_range' THEN
    SELECT COUNT(*) INTO _member_count FROM public.members WHERE tenant_id = _tenant_id;
    IF (_rules->'member_count_range'->>'min') IS NOT NULL AND _member_count < (_rules->'member_count_range'->>'min')::int THEN RETURN false; END IF;
    IF (_rules->'member_count_range'->>'max') IS NOT NULL AND _member_count > (_rules->'member_count_range'->>'max')::int THEN RETURN false; END IF;
  END IF;

  RETURN true;
END;
$$;

-- Preview count of matching tenants (super admin only)
CREATE OR REPLACE FUNCTION public.preview_broadcast_audience(_rules jsonb)
RETURNS int LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _cnt int;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COUNT(*) INTO _cnt FROM public.tenants t WHERE public.matches_broadcast_audience(t.id, _rules);
  RETURN _cnt;
END;
$$;

-- ============ 2. REWARD CATALOG ============
CREATE TABLE public.reward_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cost_in_referrals int NOT NULL DEFAULT 0,
  reward_type text NOT NULL DEFAULT 'free_month' CHECK (reward_type IN ('free_month','discount','swag','feature_unlock')),
  reward_value jsonb DEFAULT '{}'::jsonb,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_catalog TO authenticated;
GRANT ALL ON public.reward_catalog TO service_role;
ALTER TABLE public.reward_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read active rewards" ON public.reward_catalog FOR SELECT
  USING (is_active = true OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage rewards" ON public.reward_catalog FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER reward_catalog_updated_at BEFORE UPDATE ON public.reward_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.reward_catalog(id) ON DELETE RESTRICT,
  cost_paid int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','denied')),
  notes text,
  requested_by uuid REFERENCES auth.users(id),
  fulfilled_by uuid REFERENCES auth.users(id),
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins view own redemptions" ON public.reward_redemptions FOR SELECT
  USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant admins create redemptions" ON public.reward_redemptions FOR INSERT
  WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()) AND requested_by = auth.uid());
CREATE POLICY "Super admins manage redemptions" ON public.reward_redemptions FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER reward_redemptions_updated_at BEFORE UPDATE ON public.reward_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Leaderboard view
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(_limit int DEFAULT 10)
RETURNS TABLE(tenant_id uuid, tenant_name text, qualified_count bigint, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.name, COUNT(r.id) AS qualified_count,
         ROW_NUMBER() OVER (ORDER BY COUNT(r.id) DESC) AS rank
  FROM public.tenants t
  LEFT JOIN public.referrals r ON r.referrer_tenant_id = t.id AND r.status IN ('qualified','rewarded')
  GROUP BY t.id, t.name
  HAVING COUNT(r.id) > 0
  ORDER BY qualified_count DESC
  LIMIT _limit;
$$;

-- ============ 3. ANNUAL BILLING PROMPTS ============
CREATE TABLE public.annual_upgrade_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  shown_at timestamptz NOT NULL DEFAULT now(),
  action text CHECK (action IN ('dismissed','upgraded','remind_later')),
  remind_after timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.annual_upgrade_prompts TO authenticated;
GRANT ALL ON public.annual_upgrade_prompts TO service_role;
ALTER TABLE public.annual_upgrade_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins own prompts" ON public.annual_upgrade_prompts FOR ALL
  USING (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid()) AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "Super admins view prompts" ON public.annual_upgrade_prompts FOR SELECT
  USING (public.is_super_admin(auth.uid()));

-- ============ 4. NPS SURVEYS ============
CREATE TABLE public.nps_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text,
  category text GENERATED ALWAYS AS (
    CASE WHEN score >= 9 THEN 'promoter'
         WHEN score >= 7 THEN 'passive'
         ELSE 'detractor' END
  ) STORED,
  survey_cycle text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nps_surveys TO authenticated;
GRANT ALL ON public.nps_surveys TO service_role;
ALTER TABLE public.nps_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users submit own nps" ON public.nps_surveys FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own nps" ON public.nps_surveys FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Super admins view all nps" ON public.nps_surveys FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE TABLE public.nps_dismissals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.nps_dismissals TO authenticated;
GRANT ALL ON public.nps_dismissals TO service_role;
ALTER TABLE public.nps_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nps dismissal" ON public.nps_dismissals FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NPS aggregate function
CREATE OR REPLACE FUNCTION public.get_nps_summary()
RETURNS TABLE(cycle text, total bigint, promoters bigint, passives bigint, detractors bigint, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT survey_cycle,
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE category = 'promoter')::bigint,
    COUNT(*) FILTER (WHERE category = 'passive')::bigint,
    COUNT(*) FILTER (WHERE category = 'detractor')::bigint,
    ROUND(
      (COUNT(*) FILTER (WHERE category = 'promoter')::numeric - COUNT(*) FILTER (WHERE category = 'detractor')::numeric)
      / NULLIF(COUNT(*), 0) * 100, 1
    )
  FROM public.nps_surveys
  GROUP BY survey_cycle
  ORDER BY survey_cycle DESC;
$$;
