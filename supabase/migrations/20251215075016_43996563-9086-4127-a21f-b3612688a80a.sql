-- =====================================================
-- FIX: Restrict branches table to authenticated users only
-- =====================================================

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view branches" ON branches;

-- Create restrictive SELECT policy - only staff can view all branches
CREATE POLICY "Staff can view branches"
ON branches FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'volunteer'::app_role) OR
  id = get_user_branch_id(auth.uid())
);