-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'member-photos', 
  'member-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow authenticated users to upload member photos
CREATE POLICY "Staff can upload member photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Staff can update member photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);

-- Allow anyone to view member photos (public bucket)
CREATE POLICY "Anyone can view member photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'member-photos');

-- Allow staff to delete member photos
CREATE POLICY "Staff can delete member photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos'
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'secretary'::app_role) 
    OR has_role(auth.uid(), 'pastor'::app_role)
  )
);