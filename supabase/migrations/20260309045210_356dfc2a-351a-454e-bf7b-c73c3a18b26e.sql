
-- Add tenant_id to custom_fields
ALTER TABLE public.custom_fields ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to custom_field_values
ALTER TABLE public.custom_field_values ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Authenticated users can view custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Authenticated users can view custom field values" ON public.custom_field_values;

-- Custom fields: tenant admins can manage their own tenant's fields, super admins can manage all
CREATE POLICY "Tenant admins manage own custom fields"
  ON public.custom_fields
  FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid()))
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id(auth.uid()) AND is_tenant_admin(auth.uid()))
  );

-- Tenant users can view their own tenant's custom fields
CREATE POLICY "Users view own tenant custom fields"
  ON public.custom_fields
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR tenant_id = get_user_tenant_id(auth.uid())
  );

-- Custom field values: same tenant isolation
DROP POLICY IF EXISTS "Admins can manage custom field values" ON public.custom_field_values;

CREATE POLICY "Tenant users manage own field values"
  ON public.custom_field_values
  FOR ALL
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR tenant_id = get_user_tenant_id(auth.uid())
  )
  WITH CHECK (
    is_super_admin(auth.uid())
    OR tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Tenant users view own field values"
  ON public.custom_field_values
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR tenant_id = get_user_tenant_id(auth.uid())
  );
