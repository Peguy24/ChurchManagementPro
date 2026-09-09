-- 1. Broadcasts: authenticated only
DROP POLICY IF EXISTS "Authenticated read active broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated read active broadcasts"
ON public.broadcasts FOR SELECT TO authenticated
USING (is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

-- 2. Require approval for tenant-internal reads
DROP POLICY IF EXISTS "Tenant staff can view events" ON public.events;
CREATE POLICY "Tenant staff can view events"
ON public.events FOR SELECT TO authenticated
USING ((tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view ministries" ON public.ministries;
CREATE POLICY "Tenant users can view ministries"
ON public.ministries FOR SELECT TO authenticated
USING ((tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view service roles" ON public.service_roles;
CREATE POLICY "Tenant users can view service roles"
ON public.service_roles FOR SELECT TO authenticated
USING ((tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view volunteer schedules" ON public.volunteer_schedules;
CREATE POLICY "Tenant users can view volunteer schedules"
ON public.volunteer_schedules FOR SELECT TO authenticated
USING ((tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view expense categories" ON public.expense_categories;
CREATE POLICY "Tenant users can view expense categories"
ON public.expense_categories FOR SELECT TO authenticated
USING ((tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant users can view income categories" ON public.income_categories;
CREATE POLICY "Tenant users can view income categories"
ON public.income_categories FOR SELECT TO authenticated
USING ((tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)) OR is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own tenant custom fields" ON public.custom_fields;
CREATE POLICY "Users view own tenant custom fields"
ON public.custom_fields FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()) OR (tenant_id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), tenant_id)));

DROP POLICY IF EXISTS "Tenant users can view their own tenant" ON public.tenants;
CREATE POLICY "Tenant users can view their own tenant"
ON public.tenants FOR SELECT TO authenticated
USING (id = get_user_tenant_id(auth.uid()) AND is_approved_tenant_user(auth.uid(), id));