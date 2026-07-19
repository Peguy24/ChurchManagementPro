
CREATE TABLE public.prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','read','praying','archived')),
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT INSERT ON public.prayer_requests TO anon;
GRANT ALL ON public.prayer_requests TO service_role;

ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can submit prayer requests"
  ON public.prayer_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'new');

CREATE POLICY "Tenant staff can view prayer requests"
  ON public.prayer_requests FOR SELECT TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  );

CREATE POLICY "Tenant staff can update prayer requests"
  ON public.prayer_requests FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  );

CREATE POLICY "Tenant admins can delete prayer requests"
  ON public.prayer_requests FOR DELETE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE INDEX idx_prayer_requests_tenant ON public.prayer_requests(tenant_id, created_at DESC);

CREATE TRIGGER trg_prayer_requests_updated
  BEFORE UPDATE ON public.prayer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','bounced')),
  unsubscribe_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  source TEXT DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT ALL ON public.newsletter_subscribers TO service_role;

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can subscribe"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'active');

CREATE POLICY "Tenant staff can view subscribers"
  ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  );

CREATE POLICY "Tenant staff can update subscribers"
  ON public.newsletter_subscribers FOR UPDATE TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  );

CREATE POLICY "Tenant admins can delete subscribers"
  ON public.newsletter_subscribers FOR DELETE TO authenticated
  USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE INDEX idx_newsletter_subs_tenant ON public.newsletter_subscribers(tenant_id, created_at DESC);

CREATE TRIGGER trg_newsletter_subs_updated
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe(_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_updated INT;
BEGIN
  UPDATE public.newsletter_subscribers
     SET status = 'unsubscribed', updated_at = now()
   WHERE unsubscribe_token = _token AND status = 'active';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.newsletter_unsubscribe(TEXT) TO anon, authenticated;
