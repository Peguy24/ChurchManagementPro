-- 1) role_permissions: allow tenant users to read global (tenant_id IS NULL) defaults
DROP POLICY IF EXISTS "Tenant users can view their role permissions" ON public.role_permissions;
CREATE POLICY "Tenant users can view their role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (
  (tenant_id IS NULL)
  OR (tenant_id = public.get_user_tenant_id(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

-- 2) self_checkin_sessions: stop realtime broadcast + hide the session secret
ALTER PUBLICATION supabase_realtime DROP TABLE public.self_checkin_sessions;
REVOKE SELECT (secret) ON public.self_checkin_sessions FROM authenticated;
REVOKE SELECT (secret) ON public.self_checkin_sessions FROM anon;

-- 3) consolidate super-admin checks on is_super_admin()
DROP POLICY IF EXISTS "Super admins can manage invitations" ON public.admin_invitations;
CREATE POLICY "Super admins can manage invitations"
ON public.admin_invitations FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can create invitations" ON public.super_admin_invitations;
CREATE POLICY "Super admins can create invitations"
ON public.super_admin_invitations FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete invitations" ON public.super_admin_invitations;
CREATE POLICY "Super admins can delete invitations"
ON public.super_admin_invitations FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update invitations" ON public.super_admin_invitations;
CREATE POLICY "Super admins can update invitations"
ON public.super_admin_invitations FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view invitations" ON public.super_admin_invitations;
CREATE POLICY "Super admins can view invitations"
ON public.super_admin_invitations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON public.tenant_subscriptions;
CREATE POLICY "Super admins can manage subscriptions"
ON public.tenant_subscriptions FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all subscriptions" ON public.tenant_subscriptions;
CREATE POLICY "Super admins can view all subscriptions"
ON public.tenant_subscriptions FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete tenants" ON public.tenants;
CREATE POLICY "Super admins can delete tenants"
ON public.tenants FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can insert tenants" ON public.tenants;
CREATE POLICY "Super admins can insert tenants"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update tenants" ON public.tenants;
CREATE POLICY "Super admins can update tenants"
ON public.tenants FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));
