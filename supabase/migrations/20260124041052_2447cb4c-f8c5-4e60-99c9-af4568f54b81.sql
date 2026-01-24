-- ==============================================
-- Enable Super Admin access to all tenant data (SELECT only)
-- ==============================================

-- 1. Update members SELECT policy to ensure super admin access
DROP POLICY IF EXISTS "Users view members by role or branch" ON public.members;
CREATE POLICY "Tenant users and super admin can view members" 
ON public.members 
FOR SELECT 
USING (
  -- Super admin (global) can see all
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Tenant staff can see their tenant's members
  (
    members.tenant_id = get_user_tenant_id(auth.uid()) AND (
      has_tenant_role(auth.uid(), members.tenant_id, 'admin'::app_role) OR 
      has_tenant_role(auth.uid(), members.tenant_id, 'pastor'::app_role) OR 
      has_tenant_role(auth.uid(), members.tenant_id, 'secretary'::app_role) OR 
      has_tenant_role(auth.uid(), members.tenant_id, 'treasurer'::app_role)
    )
  ) OR
  -- Members can see other members in their branch
  branch_id IN (SELECT m.branch_id FROM members m WHERE m.user_id = auth.uid())
);

-- 2. Update cash_registers SELECT policy
DROP POLICY IF EXISTS "Financial staff can view cash registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Tenant financial staff can view cash registers" ON public.cash_registers;
CREATE POLICY "Tenant financial staff can view cash registers" 
ON public.cash_registers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    cash_registers.tenant_id = get_user_tenant_id(auth.uid()) AND (
      has_tenant_role(auth.uid(), cash_registers.tenant_id, 'admin'::app_role) OR 
      has_tenant_role(auth.uid(), cash_registers.tenant_id, 'treasurer'::app_role) OR 
      has_tenant_role(auth.uid(), cash_registers.tenant_id, 'pastor'::app_role)
    )
  )
);

-- 3. Update special_funds SELECT policy (no tenant_id column based on query, uses branch_id)
-- Check if special_funds has tenant_id, if not we skip it