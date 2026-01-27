-- Make storage buckets private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('member-photos', 'inventory-photos');

-- Drop public access policies
DROP POLICY IF EXISTS "Anyone can view member photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view inventory photos" ON storage.objects;

-- Create authenticated-only SELECT policies
CREATE POLICY "Authenticated users can view member photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'member-photos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view inventory photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inventory-photos' AND
    auth.role() = 'authenticated'
  );