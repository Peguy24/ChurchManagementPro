
-- Create storage bucket for church/tenant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their tenant folder
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-logos' 
  AND (
    -- Check that the folder matches their tenant_id
    (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
    AND has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Anyone can view tenant logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tenant-logos');

-- Allow tenant admins to update their logos
CREATE POLICY "Tenant admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-logos' 
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
    AND has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow tenant admins to delete their logos
CREATE POLICY "Tenant admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-logos' 
  AND (
    (storage.foldername(name))[1] = get_user_tenant_id(auth.uid())::text
    AND has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);
