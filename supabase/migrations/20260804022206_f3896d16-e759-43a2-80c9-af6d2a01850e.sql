DROP POLICY IF EXISTS "Approved tenant staff can view members" ON public.members;
CREATE POLICY "Approved tenant staff can view members"
ON public.members FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_approved_tenant_user(auth.uid(), tenant_id)
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
      OR (
        branch_id IS NOT NULL
        AND public.get_user_branch_id(auth.uid()) IS NOT NULL
        AND branch_id = public.get_user_branch_id(auth.uid())
      )
    )
  )
);