
-- Drop old SELECT policy and create tenant-aware one
DROP POLICY IF EXISTS "Tenant staff can view audit logs" ON public.financial_audit_logs;

CREATE POLICY "Tenant staff can view own audit logs"
ON public.financial_audit_logs
FOR SELECT
USING (
  -- Super admins see all
  is_super_admin(auth.uid())
  OR
  -- Tenant staff see only their tenant's logs
  (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    )
  )
);
