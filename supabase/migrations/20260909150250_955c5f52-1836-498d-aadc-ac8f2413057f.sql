DROP POLICY IF EXISTS "Tenant users can view own tenant tickets" ON public.support_tickets;

CREATE POLICY "Ticket owners and church staff can view tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
    )
  )
  OR public.is_super_admin(auth.uid())
);