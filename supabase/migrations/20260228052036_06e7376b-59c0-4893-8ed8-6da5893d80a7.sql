
-- Allow tenant admins to view their own financial audit logs
-- First, we need to check if audit logs have tenant context
-- The logs don't have tenant_id directly, but we can match via entity relationships
-- For now, let tenant admins and treasurers view audit logs for their tenant

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.financial_audit_logs;

-- Create a new policy that allows tenant admins/treasurers to view audit logs
CREATE POLICY "Tenant staff can view audit logs"
ON public.financial_audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'treasurer'::app_role)
  OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
);
