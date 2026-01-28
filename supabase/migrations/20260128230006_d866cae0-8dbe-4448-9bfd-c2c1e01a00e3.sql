
-- Drop the problematic policies on members table
DROP POLICY IF EXISTS "Tenant users and super admin can view members" ON public.members;
DROP POLICY IF EXISTS "Tenant users can view members" ON public.members;
DROP POLICY IF EXISTS "Staff and self can update members" ON public.members;

-- Create a new, cleaner SELECT policy that doesn't cause recursion
-- Uses get_user_branch_id() which is SECURITY DEFINER and won't cause recursion
CREATE POLICY "Tenant users can view members" 
ON public.members 
FOR SELECT 
USING (
  -- Super admins can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Users within the same tenant can view members
  (tenant_id = get_user_tenant_id(auth.uid()))
  OR
  -- Users can see members in their own branch (using security definer function)
  (branch_id = get_user_branch_id(auth.uid()))
  OR
  -- Users can see their own member record
  (user_id = auth.uid())
);

-- Recreate the update policy without recursion issues
CREATE POLICY "Staff and self can update own record" 
ON public.members 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'secretary'::app_role) 
  OR has_role(auth.uid(), 'pastor'::app_role) 
  OR (user_id = auth.uid())
);
