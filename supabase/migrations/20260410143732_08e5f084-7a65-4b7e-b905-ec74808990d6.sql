-- Add a SELECT policy for tenant admins to view their own tenant's policy acceptances
CREATE POLICY "Tenant admins can view own policy acceptances"
ON public.tenant_policy_acceptances
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND is_tenant_admin(auth.uid())
);