-- Add RLS policies to allow tenant admins to update their own tenant branding
CREATE POLICY "Tenant admins can update their own tenant branding"
ON public.tenants
FOR UPDATE
USING (
  id = get_user_tenant_id(auth.uid()) 
  AND has_tenant_role(auth.uid(), id, 'admin'::app_role)
);

-- Allow tenant users to view their own tenant
CREATE POLICY "Tenant users can view their own tenant"
ON public.tenants
FOR SELECT
USING (
  id = get_user_tenant_id(auth.uid())
);