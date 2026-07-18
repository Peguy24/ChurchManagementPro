
-- =========================
-- tenant_websites
-- =========================
CREATE TABLE public.tenant_websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  template text NOT NULL DEFAULT 'classic' CHECK (template IN ('classic','modern','warm')),
  is_published boolean NOT NULL DEFAULT false,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_domain text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_websites TO authenticated;
GRANT ALL ON public.tenant_websites TO service_role;

ALTER TABLE public.tenant_websites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage own website"
  ON public.tenant_websites
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  );

CREATE TRIGGER trg_tenant_websites_updated_at
  BEFORE UPDATE ON public.tenant_websites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================
-- website_addon_subscriptions
-- =========================
CREATE TABLE public.website_addon_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive','trialing','active','past_due','cancelled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  managed_by_admin boolean NOT NULL DEFAULT false,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_addon_subscriptions TO authenticated;
GRANT ALL ON public.website_addon_subscriptions TO service_role;

ALTER TABLE public.website_addon_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins view own addon subscription"
  ON public.website_addon_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  );

CREATE POLICY "Super admins manage addon subscriptions"
  ON public.website_addon_subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_website_addon_updated_at
  BEFORE UPDATE ON public.website_addon_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =========================
-- Helpers
-- =========================
CREATE OR REPLACE FUNCTION public.has_website_addon(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.website_addon_subscriptions
    WHERE tenant_id = _tenant_id
      AND (managed_by_admin = true OR status IN ('active','trialing'))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_public_website(_slug text)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  slug text,
  logo_url text,
  primary_color text,
  template text,
  content jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url, t.primary_color, w.template, w.content
  FROM public.tenants t
  JOIN public.tenant_websites w ON w.tenant_id = t.id
  WHERE t.slug = _slug
    AND w.is_published = true
    AND public.has_website_addon(t.id)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.has_website_addon(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_website(text) TO anon, authenticated;
