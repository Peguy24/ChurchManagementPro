-- Update tenant_user_roles insert policy to support invited pending users and first-admin bootstrap safely
DROP POLICY IF EXISTS "Users can insert their own role for first registration" ON public.tenant_user_roles;

CREATE POLICY "Users can insert own tenant role during signup"
ON public.tenant_user_roles
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    -- Regular invited/self-registration: always pending approval
    is_approved = false
    OR
    -- First church admin bootstrap (no admin exists yet)
    (
      is_approved = true
      AND role = 'admin'::public.app_role
      AND NOT public.tenant_has_admin(tenant_id)
    )
  )
);