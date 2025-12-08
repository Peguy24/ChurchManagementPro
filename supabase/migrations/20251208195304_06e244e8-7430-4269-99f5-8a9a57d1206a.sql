-- Fix RLS for members table - restrict access by role/branch
DROP POLICY IF EXISTS "Authenticated users can view members" ON members;

-- Only admins, pastors, secretaries can view all members
-- Other users can only view members in their own branch
CREATE POLICY "Users view members by role or branch"
ON members FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  branch_id IN (SELECT m.branch_id FROM members m WHERE m.user_id = auth.uid())
);