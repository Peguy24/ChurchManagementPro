
-- Migration 1: Fix ministry_members RLS policies (tenant isolation via ministries join)
DROP POLICY IF EXISTS "Authenticated users can view ministry members" ON ministry_members;
DROP POLICY IF EXISTS "Staff can insert ministry members" ON ministry_members;
DROP POLICY IF EXISTS "Staff can update ministry members" ON ministry_members;
DROP POLICY IF EXISTS "Leadership can delete ministry members" ON ministry_members;

CREATE POLICY "Tenant users can view ministry members" ON ministry_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ministries m 
    WHERE m.id = ministry_members.ministry_id 
    AND (m.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Tenant staff can insert ministry members" ON ministry_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM ministries m 
    WHERE m.id = ministry_members.ministry_id 
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

CREATE POLICY "Tenant staff can update ministry members" ON ministry_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM ministries m 
    WHERE m.id = ministry_members.ministry_id 
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

CREATE POLICY "Tenant leadership can delete ministry members" ON ministry_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM ministries m 
    WHERE m.id = ministry_members.ministry_id 
    AND (
      (m.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), m.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), m.tenant_id, 'pastor'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
