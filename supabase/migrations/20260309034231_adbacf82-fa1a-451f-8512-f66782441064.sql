
-- Fix custom_field_values RLS: allow tenant admins and staff to manage values

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view relevant custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Staff can insert custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Staff can update custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Admins can delete custom field values" ON public.custom_field_values;

-- SELECT: global roles OR any tenant role
CREATE POLICY "Users can view custom field values"
ON public.custom_field_values
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR has_role(auth.uid(), 'treasurer'::app_role)
  OR is_tenant_admin(auth.uid())
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'treasurer'::app_role)
);

-- INSERT: global roles OR tenant staff
CREATE POLICY "Staff can insert custom field values"
ON public.custom_field_values
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR has_role(auth.uid(), 'treasurer'::app_role)
  OR is_tenant_admin(auth.uid())
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'treasurer'::app_role)
);

-- UPDATE: global roles OR tenant staff
CREATE POLICY "Staff can update custom field values"
ON public.custom_field_values
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR has_role(auth.uid(), 'secretary'::app_role)
  OR has_role(auth.uid(), 'treasurer'::app_role)
  OR is_tenant_admin(auth.uid())
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'treasurer'::app_role)
);

-- DELETE: global admin OR tenant admin
CREATE POLICY "Admins can delete custom field values"
ON public.custom_field_values
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
);
