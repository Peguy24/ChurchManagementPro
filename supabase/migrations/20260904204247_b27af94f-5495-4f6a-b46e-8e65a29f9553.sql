-- 1) Restrict ip_address visibility on financial_audit_logs
REVOKE SELECT (ip_address) ON public.financial_audit_logs FROM authenticated;
REVOKE SELECT (ip_address) ON public.financial_audit_logs FROM anon;
GRANT SELECT (id, entity_type, entity_id, action, old_values, new_values, user_id, user_email, created_at, tenant_id)
  ON public.financial_audit_logs TO authenticated;
GRANT ALL ON public.financial_audit_logs TO service_role;

-- 2) Explicit tenant scoping on newsletter_subscribers SELECT
DROP POLICY IF EXISTS "Tenant staff can view subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Tenant staff can view subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )
);

-- 3) tenant_user_roles: admin management policy must also constrain written rows
DROP POLICY IF EXISTS "Tenant admins can manage their tenant roles" ON public.tenant_user_roles;
CREATE POLICY "Tenant admins can manage their tenant roles"
ON public.tenant_user_roles
FOR ALL
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
);