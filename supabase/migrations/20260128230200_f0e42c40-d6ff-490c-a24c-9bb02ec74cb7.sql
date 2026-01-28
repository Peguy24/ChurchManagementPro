
-- Add tenant_id column to church_settings for multi-tenant support
ALTER TABLE public.church_settings 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_church_settings_tenant_id ON public.church_settings(tenant_id);

-- Create unique constraint for setting_key per tenant
ALTER TABLE public.church_settings 
DROP CONSTRAINT IF EXISTS church_settings_tenant_setting_unique;

ALTER TABLE public.church_settings 
ADD CONSTRAINT church_settings_tenant_setting_unique UNIQUE (tenant_id, setting_key);

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can delete church settings" ON public.church_settings;
DROP POLICY IF EXISTS "Admins can insert church settings" ON public.church_settings;
DROP POLICY IF EXISTS "Admins can update church settings" ON public.church_settings;
DROP POLICY IF EXISTS "Staff can view church settings" ON public.church_settings;

-- Create new tenant-aware RLS policies

-- SELECT: Tenant staff can view their church settings
CREATE POLICY "Tenant staff can view church settings" 
ON public.church_settings 
FOR SELECT 
USING (
  -- Super admins can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Tenant users can view their own tenant's settings
  (tenant_id = get_user_tenant_id(auth.uid()))
);

-- INSERT: Tenant admins can insert settings for their church
CREATE POLICY "Tenant admins can insert church settings" 
ON public.church_settings 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (
    tenant_id = get_user_tenant_id(auth.uid()) 
    AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);

-- UPDATE: Tenant admins can update their church settings
CREATE POLICY "Tenant admins can update church settings" 
ON public.church_settings 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (
    tenant_id = get_user_tenant_id(auth.uid()) 
    AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);

-- DELETE: Tenant admins can delete their church settings
CREATE POLICY "Tenant admins can delete church settings" 
ON public.church_settings 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (
    tenant_id = get_user_tenant_id(auth.uid()) 
    AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  )
);
