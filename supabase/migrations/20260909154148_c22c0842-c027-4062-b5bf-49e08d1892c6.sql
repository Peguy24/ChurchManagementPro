DROP POLICY IF EXISTS "Tenant admins can view their denials" ON public.ai_tool_denials;
CREATE POLICY "Tenant admins can view their denials"
ON public.ai_tool_denials
FOR SELECT
TO authenticated
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  AND tenant_id = get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Tenant users can view their tenant subscription" ON public.tenant_subscriptions;
CREATE POLICY "Tenant staff can view their tenant subscription"
ON public.tenant_subscriptions
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tur.tenant_id
    FROM public.tenant_user_roles tur
    WHERE tur.user_id = auth.uid()
      AND tur.is_approved = true
      AND tur.role IN ('admin'::app_role, 'pastor'::app_role, 'treasurer'::app_role, 'secretary'::app_role)
  )
);