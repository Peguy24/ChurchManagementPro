
-- Migration 3: Fix inventory_usage RLS policies (tenant isolation via inventory_items join)
DROP POLICY IF EXISTS "Staff can view inventory usage" ON inventory_usage;
DROP POLICY IF EXISTS "Staff can insert inventory usage" ON inventory_usage;
DROP POLICY IF EXISTS "Staff can update inventory usage" ON inventory_usage;
DROP POLICY IF EXISTS "Admins can delete inventory usage" ON inventory_usage;

CREATE POLICY "Tenant staff can view inventory usage" ON inventory_usage
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM inventory_items i 
    WHERE i.id = inventory_usage.item_id 
    AND (i.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Tenant staff can insert inventory usage" ON inventory_usage
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM inventory_items i 
    WHERE i.id = inventory_usage.item_id 
    AND (
      (i.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), i.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), i.tenant_id, 'secretary'::app_role) OR
        has_tenant_role(auth.uid(), i.tenant_id, 'volunteer'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant staff can update inventory usage" ON inventory_usage
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM inventory_items i 
    WHERE i.id = inventory_usage.item_id 
    AND (
      (i.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), i.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), i.tenant_id, 'secretary'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant admins can delete inventory usage" ON inventory_usage
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM inventory_items i 
    WHERE i.id = inventory_usage.item_id 
    AND (
      (i.tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), i.tenant_id, 'admin'::app_role))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
