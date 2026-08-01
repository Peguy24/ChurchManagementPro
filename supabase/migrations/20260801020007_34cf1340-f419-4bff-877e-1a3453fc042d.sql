
DROP POLICY IF EXISTS "Tenant users can view attendance" ON public.attendance_records;
CREATE POLICY "Approved tenant staff can view attendance"
ON public.attendance_records FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.is_approved_tenant_user(auth.uid(), tenant_id)
      OR member_id IN (SELECT m.id FROM public.members m WHERE m.user_id = auth.uid())
    )
  )
);
