-- 1. Categories: remove cross-tenant NULL tenant visibility
DROP POLICY IF EXISTS "Tenant users can view expense categories" ON public.expense_categories;
CREATE POLICY "Tenant users can view expense categories"
ON public.expense_categories FOR SELECT TO authenticated
USING (
  (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Tenant users can view income categories" ON public.income_categories;
CREATE POLICY "Tenant users can view income categories"
ON public.income_categories FOR SELECT TO authenticated
USING (
  (tenant_id IS NOT NULL AND tenant_id = public.get_user_tenant_id(auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Profiles: restrict cross-user profile (email) visibility to staff roles
DROP POLICY IF EXISTS "Users can view own tenant profiles" ON public.profiles;
CREATE POLICY "Users can view own tenant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR (
    tenant_id IS NOT NULL
    AND tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- 3. tenant_user_roles: tighten self-insert of pending membership
DROP POLICY IF EXISTS "Users can insert own tenant role during signup" ON public.tenant_user_roles;
CREATE POLICY "Users can insert own pending tenant role"
ON public.tenant_user_roles FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_approved = false
  AND role = 'user'::app_role
  AND tenant_id IS NOT NULL
  AND tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_user_roles existing
    WHERE existing.user_id = auth.uid()
  )
);