CREATE POLICY "Users can view their own custom role permissions"
ON public.tenant_custom_role_permissions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tenant_user_roles tur
  WHERE tur.custom_role_id = tenant_custom_role_permissions.custom_role_id
    AND tur.user_id = auth.uid()
    AND tur.is_approved = true
));