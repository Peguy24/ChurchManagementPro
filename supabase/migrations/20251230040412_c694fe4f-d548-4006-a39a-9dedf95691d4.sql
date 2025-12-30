-- Add tenant_id to role_permissions for per-church permissions
ALTER TABLE public.role_permissions 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_role_permissions_tenant_id ON public.role_permissions(tenant_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;

-- Create new RLS policies for tenant-specific permissions
CREATE POLICY "Tenant admins can manage their role permissions"
ON public.role_permissions
FOR ALL
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant users can view their role permissions"
ON public.role_permissions
FOR SELECT
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);