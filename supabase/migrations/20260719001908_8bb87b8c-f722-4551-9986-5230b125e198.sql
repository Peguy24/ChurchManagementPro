
CREATE TABLE public.tenant_giving_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  stripe_account_id TEXT,
  stripe_enabled BOOLEAN NOT NULL DEFAULT false,
  moncash_client_id TEXT,
  moncash_client_secret TEXT,
  moncash_env TEXT NOT NULL DEFAULT 'sandbox' CHECK (moncash_env IN ('sandbox','live')),
  moncash_enabled BOOLEAN NOT NULL DEFAULT false,
  min_amount NUMERIC(12,2) NOT NULL DEFAULT 1,
  suggested_amounts JSONB NOT NULL DEFAULT '[10,25,50,100]'::jsonb,
  thank_you_message JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url TEXT,
  default_cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  default_bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_giving_settings TO authenticated;
GRANT ALL ON public.tenant_giving_settings TO service_role;

ALTER TABLE public.tenant_giving_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage own giving settings"
  ON public.tenant_giving_settings
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_tenant_admin(auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_tenant_admin(auth.uid()))
  );

CREATE TRIGGER tenant_giving_settings_updated_at
  BEFORE UPDATE ON public.tenant_giving_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.get_public_giving_config(_slug TEXT)
RETURNS TABLE(
  tenant_id UUID,
  tenant_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  currency TEXT,
  stripe_enabled BOOLEAN,
  moncash_enabled BOOLEAN,
  min_amount NUMERIC,
  suggested_amounts JSONB,
  thank_you_message JSONB,
  cover_image_url TEXT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    t.id,
    t.name,
    t.logo_url,
    t.primary_color,
    COALESCE((SELECT setting_value FROM public.church_settings WHERE tenant_id = t.id AND setting_key = 'currency' LIMIT 1), 'USD') AS currency,
    (g.stripe_enabled AND g.stripe_account_id IS NOT NULL) AS stripe_enabled,
    (g.moncash_enabled AND g.moncash_client_id IS NOT NULL AND g.moncash_client_secret IS NOT NULL) AS moncash_enabled,
    g.min_amount,
    g.suggested_amounts,
    g.thank_you_message,
    g.cover_image_url
  FROM public.tenants t
  JOIN public.tenant_giving_settings g ON g.tenant_id = t.id
  WHERE t.slug = _slug
    AND g.enabled = true
    AND public.has_website_addon(t.id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_giving_config(TEXT) TO anon, authenticated;
