-- ============================================================
-- REFERRAL PROGRAM
-- ============================================================

-- Status enum for referrals
DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending', 'qualified', 'rewarded', 'expired', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reward type enum
DO $$ BEGIN
  CREATE TYPE public.referral_reward_type AS ENUM ('trial_extension', 'stripe_coupon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- referral_codes: one per tenant
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_tenant ON public.referral_codes(tenant_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own referral code"
  ON public.referral_codes FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Tenants can create their own referral code"
  ON public.referral_codes FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid()));

CREATE POLICY "Tenants can update their own referral code"
  ON public.referral_codes FOR UPDATE
  USING (tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid()));

CREATE POLICY "Super admins can manage referral codes"
  ON public.referral_codes FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- referrals: each referral relationship
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_tenant_id uuid NOT NULL,
  referred_tenant_id uuid NOT NULL,
  referral_code text NOT NULL,
  status public.referral_status NOT NULL DEFAULT 'pending',
  qualified_at timestamptz,
  rewarded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  referrer_reward_applied boolean NOT NULL DEFAULT false,
  referred_reward_applied boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrals_no_self CHECK (referrer_tenant_id <> referred_tenant_id),
  CONSTRAINT referrals_unique_referred UNIQUE (referred_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view referrals they sent or received"
  ON public.referrals FOR SELECT
  USING (
    referrer_tenant_id = get_user_tenant_id(auth.uid())
    OR referred_tenant_id = get_user_tenant_id(auth.uid())
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage referrals"
  ON public.referrals FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- referral_rewards: audit log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  reward_type public.referral_reward_type NOT NULL,
  days_added integer NOT NULL DEFAULT 30,
  stripe_coupon_id text,
  applied_by_role text NOT NULL DEFAULT 'system',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_tenant ON public.referral_rewards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referral ON public.referral_rewards(referral_id);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own rewards"
  ON public.referral_rewards FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage rewards"
  ON public.referral_rewards FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ------------------------------------------------------------
-- Triggers: updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_referral_codes_updated ON public.referral_codes;
CREATE TRIGGER trg_referral_codes_updated
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_referrals_updated ON public.referrals;
CREATE TRIGGER trg_referrals_updated
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ------------------------------------------------------------
-- Helper: generate a unique referral code from a tenant name
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_referral_code_for_tenant(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name text;
  _prefix text;
  _suffix text;
  _candidate text;
  _attempts int := 0;
BEGIN
  SELECT name INTO _name FROM public.tenants WHERE id = _tenant_id;
  IF _name IS NULL THEN
    _prefix := 'CHURCH';
  ELSE
    _prefix := upper(regexp_replace(_name, '[^a-zA-Z0-9]', '', 'g'));
    _prefix := substring(_prefix FROM 1 FOR 6);
    IF length(_prefix) < 3 THEN
      _prefix := 'CHURCH';
    END IF;
  END IF;

  LOOP
    _attempts := _attempts + 1;
    _suffix := upper(substring(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 4));
    _candidate := _prefix || '-' || _suffix;
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _candidate) THEN
      RETURN _candidate;
    END IF;
    IF _attempts > 20 THEN
      RETURN _prefix || '-' || upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 8));
    END IF;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Public lookup: get referrer church info from a code
-- (used on signup page to validate ?ref=CODE)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_referral_code_info(_code text)
RETURNS TABLE(code text, referrer_tenant_id uuid, referrer_name text, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.code, rc.tenant_id, t.name, rc.is_active
  FROM public.referral_codes rc
  JOIN public.tenants t ON t.id = rc.tenant_id
  WHERE rc.code = upper(_code) AND rc.is_active = true
  LIMIT 1;
$$;

-- ------------------------------------------------------------
-- Stats helper for the Referrals page
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tenant_referral_stats(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invited int;
  _qualified int;
  _rewarded int;
  _free_days int;
BEGIN
  SELECT COUNT(*) INTO _invited
  FROM public.referrals WHERE referrer_tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _qualified
  FROM public.referrals
  WHERE referrer_tenant_id = _tenant_id AND status IN ('qualified', 'rewarded');

  SELECT COUNT(*) INTO _rewarded
  FROM public.referrals
  WHERE referrer_tenant_id = _tenant_id AND status = 'rewarded';

  SELECT COALESCE(SUM(days_added), 0) INTO _free_days
  FROM public.referral_rewards WHERE tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'invited', _invited,
    'qualified', _qualified,
    'rewarded', _rewarded,
    'free_days_earned', _free_days,
    'free_months_earned', ROUND(_free_days::numeric / 30, 1)
  );
END;
$$;
