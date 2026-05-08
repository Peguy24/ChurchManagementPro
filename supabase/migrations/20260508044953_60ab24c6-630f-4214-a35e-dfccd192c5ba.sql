
-- Tax exemption status enum
DO $$ BEGIN
  CREATE TYPE public.tax_exemption_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.tenant_tax_exemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  status public.tax_exemption_status NOT NULL DEFAULT 'none',
  certificate_url text,
  state text,
  ein_number text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  rejection_reason text,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_tax_exemptions ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their tenant's exemption
CREATE POLICY "Tenant admins view own exemption"
ON public.tenant_tax_exemptions FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid()))
);

CREATE POLICY "Tenant admins insert own exemption"
ON public.tenant_tax_exemptions FOR INSERT
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Tenant admins update own exemption"
ON public.tenant_tax_exemptions FOR UPDATE
USING (
  tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid())
);

CREATE POLICY "Super admins manage all exemptions"
ON public.tenant_tax_exemptions FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER trg_tenant_tax_exemptions_updated_at
BEFORE UPDATE ON public.tenant_tax_exemptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-exemption-certificates', 'tax-exemption-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — tenant admins can upload/read their own folder
CREATE POLICY "Tenant admins upload tax cert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tax-exemption-certificates'
  AND is_tenant_admin(auth.uid())
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant admins read own tax cert"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'tax-exemption-certificates'
  AND (
    is_super_admin(auth.uid())
    OR (
      is_tenant_admin(auth.uid())
      AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
    )
  )
);

CREATE POLICY "Tenant admins update own tax cert"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tax-exemption-certificates'
  AND is_tenant_admin(auth.uid())
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);

CREATE POLICY "Tenant admins delete own tax cert"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tax-exemption-certificates'
  AND is_tenant_admin(auth.uid())
  AND (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
);
