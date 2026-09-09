
DROP POLICY IF EXISTS "Tenant users can update own notifications" ON public.tenant_notifications;
DROP POLICY IF EXISTS "Tenant users can view own notifications" ON public.tenant_notifications;

CREATE POLICY "Approved tenant users can view own notifications"
ON public.tenant_notifications FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
);

CREATE POLICY "Approved tenant users can update own notifications"
ON public.tenant_notifications FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
);

DROP POLICY IF EXISTS "System can insert onboarding progress" ON public.tenant_onboarding_progress;
DROP POLICY IF EXISTS "Tenant admins can update own onboarding" ON public.tenant_onboarding_progress;
DROP POLICY IF EXISTS "Tenant users can view own onboarding" ON public.tenant_onboarding_progress;

CREATE POLICY "Approved tenant users can view own onboarding"
ON public.tenant_onboarding_progress FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
);

CREATE POLICY "Approved tenant users can insert onboarding"
ON public.tenant_onboarding_progress FOR INSERT TO authenticated
WITH CHECK (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
);

CREATE POLICY "Approved tenant users can update own onboarding"
ON public.tenant_onboarding_progress FOR UPDATE TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR (tenant_id = get_user_tenant_id(auth.uid()) AND public.is_approved_tenant_user(auth.uid(), tenant_id))
);
