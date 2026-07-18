
-- Fix cross-tenant access on custom_field_values
DROP POLICY IF EXISTS "Users can view custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Staff can insert custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Staff can update custom field values" ON public.custom_field_values;
DROP POLICY IF EXISTS "Admins can delete custom field values" ON public.custom_field_values;

CREATE POLICY "Staff can view custom field values"
ON public.custom_field_values FOR SELECT
USING (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      is_tenant_admin(auth.uid())
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  )
);

CREATE POLICY "Staff can insert custom field values"
ON public.custom_field_values FOR INSERT
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      is_tenant_admin(auth.uid())
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  )
);

CREATE POLICY "Staff can update custom field values"
ON public.custom_field_values FOR UPDATE
USING (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      is_tenant_admin(auth.uid())
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  )
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      is_tenant_admin(auth.uid())
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  )
);

CREATE POLICY "Admins can delete custom field values"
ON public.custom_field_values FOR DELETE
USING (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_tenant_admin(auth.uid())
  )
);

-- Restrict email_templates (global platform table) to super admins only
DROP POLICY IF EXISTS "Staff can view email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;

CREATE POLICY "Super admins can view email templates"
ON public.email_templates FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert email templates"
ON public.email_templates FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update email templates"
ON public.email_templates FOR UPDATE
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete email templates"
ON public.email_templates FOR DELETE
USING (is_super_admin(auth.uid()));
