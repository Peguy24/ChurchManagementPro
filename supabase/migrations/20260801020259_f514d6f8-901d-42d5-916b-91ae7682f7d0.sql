
DROP POLICY IF EXISTS "Tenant users can view branches" ON public.branches;
CREATE POLICY "Approved tenant staff can view branches"
ON public.branches FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_approved_tenant_user(auth.uid(), tenant_id)
  )
);
