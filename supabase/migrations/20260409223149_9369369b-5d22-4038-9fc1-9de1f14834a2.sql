
-- =============================================
-- 1. LOGIN VERIFICATION CODES: Block all writes from authenticated users
-- =============================================

-- Block INSERT from authenticated users (only service_role should insert)
CREATE POLICY "Only service role can insert verification codes"
ON public.login_verification_codes
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Block UPDATE from authenticated users
CREATE POLICY "Only service role can update verification codes"
ON public.login_verification_codes
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Block DELETE from authenticated users
CREATE POLICY "Only service role can delete verification codes"
ON public.login_verification_codes
FOR DELETE
TO authenticated
USING (false);

-- Also block anon
CREATE POLICY "No anon access to verification codes"
ON public.login_verification_codes
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- =============================================
-- 2. TENANT USER ROLES: Replace race-prone RLS with atomic function
-- =============================================

-- Drop the old permissive INSERT policy that allows self-assignment of admin
DROP POLICY IF EXISTS "Users can insert own tenant role during signup" ON public.tenant_user_roles;

-- Create a safer INSERT policy: users can only insert with is_approved = false
CREATE POLICY "Users can insert own tenant role during signup"
ON public.tenant_user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id = get_user_tenant_id(auth.uid())
  AND is_approved = false
);

-- Create an atomic function for admin bootstrap that uses row locking
CREATE OR REPLACE FUNCTION public.claim_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _user_id uuid;
  _user_tenant uuid;
  _has_admin boolean;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verify user belongs to this tenant
  SELECT tenant_id INTO _user_tenant FROM public.profiles WHERE id = _user_id;
  IF _user_tenant IS DISTINCT FROM _tenant_id THEN
    RETURN false;
  END IF;

  -- Atomic check: lock the tenant_user_roles rows for this tenant to prevent race
  PERFORM 1 FROM public.tenant_user_roles
  WHERE tenant_id = _tenant_id AND role = 'admin' AND is_approved = true
  FOR UPDATE;

  -- Re-check after lock
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_user_roles
    WHERE tenant_id = _tenant_id AND role = 'admin' AND is_approved = true
  ) INTO _has_admin;

  IF _has_admin THEN
    RETURN false;
  END IF;

  -- Upsert: set user as approved admin
  INSERT INTO public.tenant_user_roles (tenant_id, user_id, role, is_approved)
  VALUES (_tenant_id, _user_id, 'admin', true)
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET role = 'admin', is_approved = true;

  RETURN true;
END;
$$;

-- =============================================
-- 3. MEMBER PHOTOS STORAGE: Add role restriction for SELECT
-- =============================================

-- Drop the current broad tenant-scoped SELECT policy
DROP POLICY IF EXISTS "Tenant users can view member photos" ON storage.objects;

-- Create role-restricted SELECT policy matching members table access
CREATE POLICY "Tenant staff can view member photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  )
);
