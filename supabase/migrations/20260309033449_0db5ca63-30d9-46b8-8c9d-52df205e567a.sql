
-- Drop the old restrictive policy that only allows global admins
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;

-- Create new policy that allows both global admins and tenant admins
CREATE POLICY "Admins can manage custom fields"
ON public.custom_fields
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
);
