
CREATE TABLE public.tenant_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('hero','service','contact','gallery','logo','other')),
  storage_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_media_tenant_cat ON public.tenant_media(tenant_id, category, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_media TO authenticated;
GRANT ALL ON public.tenant_media TO service_role;
GRANT SELECT ON public.tenant_media TO anon;

ALTER TABLE public.tenant_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members view media"
  ON public.tenant_media FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "tenant admins insert media"
  ON public.tenant_media FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "tenant admins update media"
  ON public.tenant_media FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "tenant admins delete media"
  ON public.tenant_media FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "public read media for published sites"
  ON public.tenant_media FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_websites w
      WHERE w.tenant_id = tenant_media.tenant_id AND w.is_published = true
    )
  );

CREATE TRIGGER trg_tenant_media_updated_at
  BEFORE UPDATE ON public.tenant_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage policies for bucket 'tenant-media'; path convention: {tenant_id}/{category}/{filename}
CREATE POLICY "tenant media read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND (
      (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE POLICY "tenant media insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-media'
    AND (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'admin')
      OR public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'pastor')
      OR public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'secretary')
    )
  );

CREATE POLICY "tenant media update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
  );

CREATE POLICY "tenant media delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'tenant-media'
    AND (storage.foldername(name))[1]::uuid = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'admin')
      OR public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'pastor')
      OR public.has_tenant_role(auth.uid(), public.get_user_tenant_id(auth.uid()), 'secretary')
    )
  );
