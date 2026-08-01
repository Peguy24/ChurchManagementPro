
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS pending_photo_url text,
  ADD COLUMN IF NOT EXISTS pending_photo_at timestamptz;

CREATE TABLE IF NOT EXISTS public.member_photo_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_photo_links_member ON public.member_photo_links(member_id);
CREATE INDEX IF NOT EXISTS idx_member_photo_links_tenant ON public.member_photo_links(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_photo_links TO authenticated;
GRANT ALL ON public.member_photo_links TO service_role;

ALTER TABLE public.member_photo_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved staff manage photo links"
ON public.member_photo_links
FOR ALL
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_approved_tenant_user(auth.uid(), tenant_id)
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_approved_tenant_user(auth.uid(), tenant_id)
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
    )
  )
);

CREATE TRIGGER trg_member_photo_links_updated_at
BEFORE UPDATE ON public.member_photo_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
