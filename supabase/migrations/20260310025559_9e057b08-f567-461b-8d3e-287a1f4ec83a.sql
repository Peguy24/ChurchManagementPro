
-- Migration 2: Fix member_documents RLS policies (tenant isolation via members join)
DROP POLICY IF EXISTS "Staff can view member documents" ON member_documents;
DROP POLICY IF EXISTS "Staff can insert member documents" ON member_documents;
DROP POLICY IF EXISTS "Staff can update member documents" ON member_documents;
DROP POLICY IF EXISTS "Admins can delete member documents" ON member_documents;

CREATE POLICY "Tenant staff can view member documents" ON member_documents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM members m 
    WHERE m.id = member_documents.member_id 
    AND (m.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Tenant staff can insert member documents" ON member_documents
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM members m 
    WHERE m.id = member_documents.member_id 
    AND (
      (m.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), m.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), m.tenant_id, 'pastor'::app_role) OR
        has_tenant_role(auth.uid(), m.tenant_id, 'secretary'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant staff can update member documents" ON member_documents
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM members m 
    WHERE m.id = member_documents.member_id 
    AND (
      (m.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), m.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), m.tenant_id, 'pastor'::app_role) OR
        has_tenant_role(auth.uid(), m.tenant_id, 'secretary'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant admins can delete member documents" ON member_documents
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM members m 
    WHERE m.id = member_documents.member_id 
    AND (
      (m.tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), m.tenant_id, 'admin'::app_role))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
