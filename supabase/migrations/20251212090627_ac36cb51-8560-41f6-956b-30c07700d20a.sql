-- Create a security definer function to get user's branch_id without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_branch_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT branch_id FROM members WHERE user_id = user_uuid LIMIT 1;
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users view members by role or branch" ON members;

-- Create a fixed policy that doesn't cause recursion
CREATE POLICY "Users view members by role or branch"
ON members FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'pastor'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role) OR
  branch_id = get_user_branch_id(auth.uid())
);