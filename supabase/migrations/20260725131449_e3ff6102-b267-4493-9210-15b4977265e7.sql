DROP POLICY IF EXISTS "tenant media update" ON storage.objects;
CREATE POLICY "tenant media update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenant-media'
  AND ((storage.foldername(name))[1])::uuid = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'tenant-media'
  AND ((storage.foldername(name))[1])::uuid = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  )
);