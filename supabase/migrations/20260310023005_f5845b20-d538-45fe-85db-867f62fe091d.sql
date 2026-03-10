
DROP POLICY IF EXISTS "Staff can upload inventory photos" ON storage.objects;
CREATE POLICY "Staff can upload inventory photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inventory-photos' AND
    auth.role() = 'authenticated' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'secretary'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.tenant_user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'secretary', 'pastor')
          AND is_approved = true
      )
    )
  );

DROP POLICY IF EXISTS "Staff can update inventory photos" ON storage.objects;
CREATE POLICY "Staff can update inventory photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'inventory-photos' AND
    auth.role() = 'authenticated' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'secretary'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.tenant_user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'secretary', 'pastor')
          AND is_approved = true
      )
    )
  );

DROP POLICY IF EXISTS "Admins can delete inventory photos" ON storage.objects;
CREATE POLICY "Admins can delete inventory photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'inventory-photos' AND
    auth.role() = 'authenticated' AND
    (
      has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.tenant_user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'pastor')
          AND is_approved = true
      )
    )
  );
