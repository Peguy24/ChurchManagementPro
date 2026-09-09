DROP POLICY IF EXISTS "Tenant staff can view inventory" ON public.inventory_items;
CREATE POLICY "Tenant staff can view inventory" ON public.inventory_items
FOR SELECT USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id))
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Tenant members can view custom roles" ON public.tenant_custom_roles;
CREATE POLICY "Tenant members can view custom roles" ON public.tenant_custom_roles
FOR SELECT USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id))
  OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "tenant members view media" ON public.tenant_media;
CREATE POLICY "tenant members view media" ON public.tenant_media
FOR SELECT USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id))
  OR is_super_admin(auth.uid())
);