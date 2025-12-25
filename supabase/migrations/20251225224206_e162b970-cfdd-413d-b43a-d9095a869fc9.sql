-- Drop the existing SELECT policy for members
DROP POLICY IF EXISTS "Users view members by role or branch" ON public.members;

-- Create updated SELECT policy that includes treasurer role
CREATE POLICY "Users view members by role or branch" 
ON public.members 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'secretary'::app_role) OR 
  has_role(auth.uid(), 'treasurer'::app_role) OR 
  (branch_id = get_user_branch_id(auth.uid()))
);