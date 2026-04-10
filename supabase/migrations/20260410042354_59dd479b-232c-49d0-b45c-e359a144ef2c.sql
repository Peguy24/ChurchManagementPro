
-- Restrict platform_permissions SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view platform permissions" ON public.platform_permissions;

CREATE POLICY "Authenticated users can view platform permissions"
ON public.platform_permissions
FOR SELECT
TO authenticated
USING (true);
