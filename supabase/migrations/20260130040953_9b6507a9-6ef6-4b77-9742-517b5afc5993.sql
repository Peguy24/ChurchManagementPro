
-- Drop existing storage policies for member-photos
DROP POLICY IF EXISTS "Staff can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update member photos" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete member photos" ON storage.objects;

-- Create new policies that support both global roles AND tenant roles
CREATE POLICY "Staff can upload member photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'member-photos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  )
);

CREATE POLICY "Staff can update member photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'member-photos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  )
);

CREATE POLICY "Staff can delete member photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'member-photos' AND (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'secretary'::app_role) OR
    has_role(auth.uid(), 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role) OR
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
  )
);
