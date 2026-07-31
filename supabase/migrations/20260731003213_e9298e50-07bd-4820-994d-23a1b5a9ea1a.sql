DROP POLICY IF EXISTS "Financial roles can insert credit operations" ON public.credit_operations;
CREATE POLICY "Financial roles can insert credit operations"
ON public.credit_operations FOR INSERT TO authenticated
WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)));

DROP POLICY IF EXISTS "Financial roles can update credit operations" ON public.credit_operations;
CREATE POLICY "Financial roles can update credit operations"
ON public.credit_operations FOR UPDATE TO authenticated
USING ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)))
WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)));

DROP POLICY IF EXISTS "Financial roles can insert credit payments" ON public.credit_payments;
CREATE POLICY "Financial roles can insert credit payments"
ON public.credit_payments FOR INSERT TO authenticated
WITH CHECK ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_role(auth.uid(), 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)));

DROP POLICY IF EXISTS "Tenant members can view custom role permissions" ON public.tenant_custom_role_permissions;
CREATE POLICY "Tenant admins can view custom role permissions"
ON public.tenant_custom_role_permissions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_custom_roles tcr
  WHERE tcr.id = tenant_custom_role_permissions.custom_role_id
    AND tcr.tenant_id = get_user_tenant_id(auth.uid())
    AND is_tenant_admin(auth.uid())
));