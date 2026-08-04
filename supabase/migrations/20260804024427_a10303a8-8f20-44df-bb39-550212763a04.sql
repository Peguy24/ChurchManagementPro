-- 1. platform_permissions: restrict metadata to platform staff
DROP POLICY IF EXISTS "Authenticated users can view platform permissions" ON public.platform_permissions;
CREATE POLICY "Platform staff can view platform permissions"
ON public.platform_permissions
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()) OR public.has_any_platform_role(auth.uid()));

-- 2. role_permissions: strict tenant scoping, global rows only for super admins
DROP POLICY IF EXISTS "Tenant users can view their role permissions" ON public.role_permissions;
CREATE POLICY "Tenant users can view their role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Tenant admins can manage their role permissions" ON public.role_permissions;
CREATE POLICY "Tenant admins can manage their role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (
  (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR public.is_super_admin(auth.uid())
);

-- 3. self_checkin_sessions: staff-only reads, secret hidden from clients and realtime
DROP POLICY IF EXISTS "Tenant staff can view self checkin sessions" ON public.self_checkin_sessions;
CREATE POLICY "Tenant staff can view self checkin sessions"
ON public.self_checkin_sessions
FOR SELECT
TO authenticated
USING (
  (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
    ))
  OR public.is_super_admin(auth.uid())
);

REVOKE SELECT ON public.self_checkin_sessions FROM authenticated, anon;
GRANT SELECT (
  id, tenant_id, event_id, branch_id, venue_lat, venue_lng, radius_m,
  require_location, is_open, opened_by, opened_at, closed_at,
  checkin_count, created_at, updated_at
) ON public.self_checkin_sessions TO authenticated;
GRANT ALL ON public.self_checkin_sessions TO service_role;

-- exclude the secret column from realtime broadcasts
ALTER PUBLICATION supabase_realtime DROP TABLE public.self_checkin_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.self_checkin_sessions (
  id, tenant_id, event_id, branch_id, venue_lat, venue_lng, radius_m,
  require_location, is_open, opened_by, opened_at, closed_at,
  checkin_count, created_at, updated_at
);