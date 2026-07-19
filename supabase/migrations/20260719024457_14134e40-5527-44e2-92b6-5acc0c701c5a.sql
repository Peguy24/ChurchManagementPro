
DROP FUNCTION IF EXISTS public.claim_tenant_subdomain(uuid, text);

CREATE OR REPLACE FUNCTION public.claim_tenant_subdomain(_tenant_id uuid, _subdomain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _clean text;
  _host text;
  _platform text := 'churchmanagementpro.com';
  _existing_id uuid;
  _new_id uuid;
BEGIN
  IF NOT (public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::app_role)
          OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  _clean := lower(btrim(COALESCE(_subdomain, '')));
  _clean := regexp_replace(_clean, '\.' || _platform || '$', '');

  IF _clean IS NULL OR length(_clean) < 2 OR length(_clean) > 63 THEN
    RAISE EXCEPTION 'Subdomain must be 2-63 characters' USING ERRCODE = '22023';
  END IF;
  IF _clean !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Subdomain may only contain lowercase letters, numbers and hyphens' USING ERRCODE = '22023';
  END IF;
  IF _clean IN ('www','api','app','admin','mail','support','status','sites','static','cdn','help','docs','blog') THEN
    RAISE EXCEPTION 'This subdomain is reserved' USING ERRCODE = '23514';
  END IF;

  _host := _clean || '.' || _platform;

  SELECT id INTO _existing_id
  FROM public.tenant_domains
  WHERE lower(hostname) = _host AND status <> 'removed'
  LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'This subdomain is already taken' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.tenant_domains (tenant_id, hostname, kind, is_primary, status, last_verified_at)
  VALUES (_tenant_id, _host, 'subdomain', false, 'active', now())
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object('id', _new_id, 'hostname', _host, 'status', 'active');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.claim_tenant_subdomain(uuid, text) TO authenticated;
