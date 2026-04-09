-- Fix 1: Restrict profiles SELECT to same-tenant users + super admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own tenant profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR tenant_id = get_user_tenant_id(auth.uid())
    OR is_super_admin(auth.uid())
  );

-- Fix 2: Remove public SELECT on super_admin_invitations (validation uses RPC function)
DROP POLICY IF EXISTS "Public can validate active tokens" ON public.super_admin_invitations;
-- Add authenticated-only policy for the Auth.tsx update query (marking used)
CREATE POLICY "Authenticated users can validate active tokens"
  ON public.super_admin_invitations FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL AND expires_at > now()
  );

-- Fix 3: Scope member-documents storage SELECT to tenant folder
DROP POLICY IF EXISTS "Staff can view member documents files" ON storage.objects;
CREATE POLICY "Tenant staff can view member documents files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'member-documents'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  );

-- Also scope member-documents DELETE and INSERT to tenant folder
DROP POLICY IF EXISTS "Staff can delete member documents files" ON storage.objects;
CREATE POLICY "Tenant staff can delete member documents files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'member-documents'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role))
  );

DROP POLICY IF EXISTS "Staff can upload member documents" ON storage.objects;
CREATE POLICY "Tenant staff can upload member documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'member-documents'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role))
  );

-- Fix 4: Create a secure function for super admin token validation (used by Auth.tsx)
CREATE OR REPLACE FUNCTION public.validate_and_mark_super_admin_invitation(_token text)
RETURNS TABLE(id uuid, email text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT sai.id, sai.email, sai.expires_at
  FROM public.super_admin_invitations sai
  WHERE sai.token = _token
    AND sai.used_at IS NULL
    AND sai.expires_at > now()
  LIMIT 1;
END;
$$;