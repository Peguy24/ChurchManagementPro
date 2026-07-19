
-- ============================================================
-- Table: tenant_domains
-- ============================================================
CREATE TABLE public.tenant_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('subdomain', 'custom')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verifying', 'active', 'failed', 'removed')),
  ssl_provisioned_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tenant_domains_hostname_lower_idx
  ON public.tenant_domains (lower(hostname))
  WHERE status <> 'removed';

CREATE INDEX tenant_domains_tenant_id_idx ON public.tenant_domains (tenant_id);

-- Only one primary domain per tenant (partial unique index)
CREATE UNIQUE INDEX tenant_domains_one_primary_per_tenant
  ON public.tenant_domains (tenant_id)
  WHERE is_primary = true AND status <> 'removed';

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_domains TO authenticated;
GRANT ALL ON public.tenant_domains TO service_role;
-- anon can look up domains through the public RPC only, not table-level

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

-- Tenant admins can see their own church's domains
CREATE POLICY "Tenant admins view own domains"
  ON public.tenant_domains FOR SELECT
  TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant admins insert own domains"
  ON public.tenant_domains FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant admins update own domains"
  ON public.tenant_domains FOR UPDATE
  TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant admins delete own domains"
  ON public.tenant_domains FOR DELETE
  TO authenticated
  USING (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER tenant_domains_updated_at
  BEFORE UPDATE ON public.tenant_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Reserved subdomain list
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_reserved_subdomain(_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(_slug) = ANY (ARRAY[
    'www', 'api', 'app', 'admin', 'super-admin', 'superadmin',
    'mail', 'email', 'smtp', 'imap', 'pop', 'pop3',
    'cdn', 'assets', 'static', 'media', 'files', 'uploads',
    'blog', 'help', 'support', 'status', 'docs', 'documentation',
    'dashboard', 'auth', 'login', 'signup', 'register', 'account',
    'site', 'sites', 'go', 'link', 'links', 'l',
    'churchmanagementpro', 'cmp', 'lovable',
    'test', 'staging', 'dev', 'preview', 'demo',
    'ns', 'ns1', 'ns2', 'dns',
    'stripe', 'paypal', 'billing', 'checkout', 'pay',
    'root', 'public', 'private'
  ]);
$$;

-- ============================================================
-- Helper: claim a free subdomain for a tenant
-- ============================================================
CREATE OR REPLACE FUNCTION public.claim_tenant_subdomain(_tenant_id uuid, _slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text;
  _existing_id uuid;
  _new_id uuid;
BEGIN
  -- Auth: must be tenant admin or super admin
  IF NOT (public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::app_role)
          OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Normalize
  _clean := lower(btrim(_slug));

  -- Format: 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing/double hyphen
  IF _clean IS NULL OR length(_clean) < 3 OR length(_clean) > 40 THEN
    RAISE EXCEPTION 'Subdomain must be 3–40 characters' USING ERRCODE = '22023';
  END IF;
  IF _clean !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Only lowercase letters, numbers, and hyphens allowed' USING ERRCODE = '22023';
  END IF;
  IF _clean LIKE '%--%' THEN
    RAISE EXCEPTION 'Consecutive hyphens are not allowed' USING ERRCODE = '22023';
  END IF;
  IF public.is_reserved_subdomain(_clean) THEN
    RAISE EXCEPTION 'This subdomain is reserved' USING ERRCODE = '23514';
  END IF;

  -- If tenant already has a subdomain, replace it (single subdomain per tenant)
  UPDATE public.tenant_domains
    SET status = 'removed', is_primary = false
    WHERE tenant_id = _tenant_id AND kind = 'subdomain' AND status <> 'removed';

  -- Check uniqueness against active rows
  SELECT id INTO _existing_id
  FROM public.tenant_domains
  WHERE lower(hostname) = _clean || '.churchmanagementpro.com'
    AND status <> 'removed'
  LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'That subdomain is already taken' USING ERRCODE = '23505';
  END IF;

  -- Insert active row (subdomains are covered by our wildcard cert)
  INSERT INTO public.tenant_domains
    (tenant_id, hostname, kind, is_primary, status, ssl_provisioned_at, last_verified_at)
  VALUES
    (_tenant_id, _clean || '.churchmanagementpro.com', 'subdomain',
     NOT EXISTS (SELECT 1 FROM public.tenant_domains WHERE tenant_id = _tenant_id AND is_primary = true AND status <> 'removed'),
     'active', now(), now())
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object(
    'id', _new_id,
    'hostname', _clean || '.churchmanagementpro.com',
    'status', 'active'
  );
END;
$$;

-- ============================================================
-- Helper: add a custom (bring-your-own) domain
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_tenant_custom_domain(_tenant_id uuid, _hostname text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _clean text;
  _existing_id uuid;
  _new_id uuid;
  _token text;
BEGIN
  IF NOT (public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::app_role)
          OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  _clean := lower(btrim(_hostname));
  -- Strip protocol / trailing slash / paths if user pasted them
  _clean := regexp_replace(_clean, '^https?://', '');
  _clean := regexp_replace(_clean, '/.*$', '');

  -- Basic hostname validation
  IF _clean IS NULL OR length(_clean) < 4 OR length(_clean) > 253 THEN
    RAISE EXCEPTION 'Invalid domain length' USING ERRCODE = '22023';
  END IF;
  IF _clean !~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid domain format' USING ERRCODE = '22023';
  END IF;
  -- Block using our own domain as custom
  IF _clean LIKE '%churchmanagementpro.com' OR _clean LIKE '%.lovable.app' THEN
    RAISE EXCEPTION 'Use the free subdomain option for this domain' USING ERRCODE = '23514';
  END IF;

  -- Uniqueness across active rows
  SELECT id INTO _existing_id
  FROM public.tenant_domains
  WHERE lower(hostname) = _clean AND status <> 'removed'
  LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'This domain is already connected to a project' USING ERRCODE = '23505';
  END IF;

  _token := 'cmp-verify=' || encode(gen_random_bytes(16), 'hex');

  INSERT INTO public.tenant_domains
    (tenant_id, hostname, kind, is_primary, status, verification_token)
  VALUES
    (_tenant_id, _clean, 'custom', false, 'pending', _token)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object(
    'id', _new_id,
    'hostname', _clean,
    'status', 'pending',
    'dns_records', jsonb_build_array(
      jsonb_build_object(
        'type', 'CNAME',
        'name', CASE WHEN _clean LIKE 'www.%' THEN 'www' ELSE '@' END,
        'value', 'sites.churchmanagementpro.com',
        'note', 'Points your domain to our servers'
      ),
      jsonb_build_object(
        'type', 'TXT',
        'name', '_cmp-verify',
        'value', _token,
        'note', 'Proves you own this domain'
      )
    )
  );
END;
$$;

-- ============================================================
-- Helper: set a domain as primary
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_primary_tenant_domain(_domain_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _status text;
BEGIN
  SELECT tenant_id, status INTO _tenant_id, _status
  FROM public.tenant_domains WHERE id = _domain_id;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Domain not found' USING ERRCODE = '02000';
  END IF;
  IF NOT (public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::app_role)
          OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;
  IF _status <> 'active' THEN
    RAISE EXCEPTION 'Only active domains can be primary' USING ERRCODE = '23514';
  END IF;

  UPDATE public.tenant_domains SET is_primary = false
    WHERE tenant_id = _tenant_id AND is_primary = true;
  UPDATE public.tenant_domains SET is_primary = true
    WHERE id = _domain_id;
END;
$$;

-- ============================================================
-- Update public site lookup to accept subdomain slug or hostname
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_website(_slug text)
RETURNS TABLE(tenant_id uuid, tenant_name text, slug text, logo_url text, primary_color text, template text, content jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url, t.primary_color, w.template, w.content
  FROM public.tenants t
  JOIN public.tenant_websites w ON w.tenant_id = t.id
  WHERE t.slug = _slug
    AND w.is_published = true
    AND public.has_website_addon(t.id)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_website_by_hostname(_hostname text)
RETURNS TABLE(tenant_id uuid, tenant_name text, slug text, logo_url text, primary_color text, template text, content jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.slug, t.logo_url, t.primary_color, w.template, w.content
  FROM public.tenant_domains d
  JOIN public.tenants t ON t.id = d.tenant_id
  JOIN public.tenant_websites w ON w.tenant_id = t.id
  WHERE lower(d.hostname) = lower(_hostname)
    AND d.status = 'active'
    AND w.is_published = true
    AND public.has_website_addon(t.id)
  LIMIT 1;
$$;
