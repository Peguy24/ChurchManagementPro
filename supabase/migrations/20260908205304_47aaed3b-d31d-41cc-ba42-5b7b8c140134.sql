DROP POLICY IF EXISTS "Tenant staff can view own audit logs" ON public.financial_audit_logs;

CREATE POLICY "Tenant staff can view own audit logs"
ON public.financial_audit_logs
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR (
        user_id = auth.uid()
        AND (
          has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
          OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "Tenant users can view their role permissions" ON public.role_permissions;

CREATE POLICY "Tenant users can view their role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    is_approved_tenant_user(auth.uid(), get_user_tenant_id(auth.uid()))
    AND (
      tenant_id IS NULL
      OR tenant_id = get_user_tenant_id(auth.uid())
    )
  )
);