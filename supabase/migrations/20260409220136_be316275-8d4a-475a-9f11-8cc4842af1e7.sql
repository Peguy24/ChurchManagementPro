-- Fix 1: Super admin invitation tokens - restrict to super admins only
DROP POLICY IF EXISTS "Authenticated users can validate active tokens" ON public.super_admin_invitations;
-- No replacement needed: token validation uses validate_super_admin_invitation() RPC
-- and marking used uses the existing super admin UPDATE policy

-- Fix 2: Archive tables - add role checks
DROP POLICY IF EXISTS "Tenant admins can read donations archive" ON public.donations_archive;
CREATE POLICY "Tenant staff can read donations archive"
  ON public.donations_archive FOR SELECT
  TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid())
     AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
       OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Tenant admins can read attendance archive" ON public.attendance_records_archive;
CREATE POLICY "Tenant staff can read attendance archive"
  ON public.attendance_records_archive FOR SELECT
  TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid())
     AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
       OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
       OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Tenant admins can read expenses archive" ON public.expenses_archive;
CREATE POLICY "Tenant staff can read expenses archive"
  ON public.expenses_archive FOR SELECT
  TO authenticated
  USING (
    (tenant_id = get_user_tenant_id(auth.uid())
     AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
       OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)))
    OR is_super_admin(auth.uid())
  );

-- Fix 3: Events - remove broad anon policy
DROP POLICY IF EXISTS "Anon can view events by tenant" ON public.events;

-- Fix 4: Member photos - add tenant folder isolation to upload/update/delete
DROP POLICY IF EXISTS "Staff can upload member photos" ON storage.objects;
CREATE POLICY "Tenant staff can upload member photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'member-photos'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role))
  );

DROP POLICY IF EXISTS "Staff can update member photos" ON storage.objects;
CREATE POLICY "Tenant staff can update member photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role))
  );

DROP POLICY IF EXISTS "Staff can delete member photos" ON storage.objects;
CREATE POLICY "Tenant staff can delete member photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'member-photos'
    AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
    AND (has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role))
  );

-- Fix 5: Login verification codes - remove client readability of codes
DROP POLICY IF EXISTS "Users can read own codes" ON public.login_verification_codes;
-- No SELECT policy needed - codes are validated server-side in the edge function