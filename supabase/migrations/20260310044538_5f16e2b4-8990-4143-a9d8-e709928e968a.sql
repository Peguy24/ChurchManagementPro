
-- Create tenant_custom_roles table
CREATE TABLE public.tenant_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create tenant_custom_role_permissions table
CREATE TABLE public.tenant_custom_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_role_id uuid NOT NULL REFERENCES public.tenant_custom_roles(id) ON DELETE CASCADE,
  permission_group text NOT NULL,
  UNIQUE(custom_role_id, permission_group)
);

-- Add custom_role_id to tenant_user_roles
ALTER TABLE public.tenant_user_roles
  ADD COLUMN custom_role_id uuid REFERENCES public.tenant_custom_roles(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.tenant_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_custom_role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS for tenant_custom_roles: tenant members can read, admins can write
CREATE POLICY "Tenant members can view custom roles"
  ON public.tenant_custom_roles FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can insert custom roles"
  ON public.tenant_custom_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_tenant_admin(auth.uid())
  );

CREATE POLICY "Tenant admins can update custom roles"
  ON public.tenant_custom_roles FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_tenant_admin(auth.uid())
  );

CREATE POLICY "Tenant admins can delete custom roles"
  ON public.tenant_custom_roles FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_tenant_admin(auth.uid())
  );

-- RLS for tenant_custom_role_permissions: access through custom role's tenant
CREATE POLICY "Tenant members can view custom role permissions"
  ON public.tenant_custom_role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_custom_roles tcr
      WHERE tcr.id = custom_role_id
        AND tcr.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Tenant admins can manage custom role permissions"
  ON public.tenant_custom_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_custom_roles tcr
      WHERE tcr.id = custom_role_id
        AND tcr.tenant_id = public.get_user_tenant_id(auth.uid())
        AND public.is_tenant_admin(auth.uid())
    )
  );

CREATE POLICY "Tenant admins can delete custom role permissions"
  ON public.tenant_custom_role_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_custom_roles tcr
      WHERE tcr.id = custom_role_id
        AND tcr.tenant_id = public.get_user_tenant_id(auth.uid())
        AND public.is_tenant_admin(auth.uid())
    )
  );

-- Updated_at trigger for tenant_custom_roles
CREATE TRIGGER update_tenant_custom_roles_updated_at
  BEFORE UPDATE ON public.tenant_custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
