DROP POLICY IF EXISTS "Authenticated read active broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated read targeted active broadcasts"
ON public.broadcasts
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND starts_at <= now()
  AND (ends_at IS NULL OR ends_at > now())
  AND (
    is_super_admin(auth.uid())
    OR public.matches_broadcast_audience(get_user_tenant_id(auth.uid()), audience_rules)
  )
);

DROP POLICY IF EXISTS "Tenant staff can view church settings" ON public.church_settings;
CREATE POLICY "Tenant staff can view church settings"
ON public.church_settings
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND is_approved_tenant_user(auth.uid(), tenant_id))
);