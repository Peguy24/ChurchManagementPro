DROP POLICY IF EXISTS "Tenant staff can view member documents" ON public.member_documents;
CREATE POLICY "Tenant staff can view member documents"
ON public.member_documents
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.id = member_documents.member_id
    AND (
      (m.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), m.tenant_id, 'admin'::app_role)
        OR has_tenant_role(auth.uid(), m.tenant_id, 'pastor'::app_role)
        OR has_tenant_role(auth.uid(), m.tenant_id, 'secretary'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
));