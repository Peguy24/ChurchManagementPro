DROP POLICY "Tenant staff can view alerts" ON public.pastoral_alerts;
CREATE POLICY "Tenant staff can view alerts" ON public.pastoral_alerts
FOR SELECT TO authenticated
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  ))
  OR is_super_admin(auth.uid())
);