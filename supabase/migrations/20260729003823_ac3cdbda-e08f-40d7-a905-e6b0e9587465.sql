CREATE OR REPLACE FUNCTION public.generate_referral_code_for_tenant(_tenant_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _name text;
  _prefix text;
  _suffix text;
  _candidate text;
  _attempts int := 0;
BEGIN
  SELECT name INTO _name FROM public.tenants WHERE id = _tenant_id;
  IF _name IS NULL THEN
    _prefix := 'CHURCH';
  ELSE
    _prefix := upper(regexp_replace(_name, '[^a-zA-Z0-9]', '', 'g'));
    _prefix := substring(_prefix FROM 1 FOR 6);
    IF length(_prefix) < 3 THEN
      _prefix := 'CHURCH';
    END IF;
  END IF;

  LOOP
    _attempts := _attempts + 1;
    _suffix := upper(substring(encode(extensions.gen_random_bytes(4), 'hex') FROM 1 FOR 4));
    _candidate := _prefix || '-' || _suffix;
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = _candidate) THEN
      RETURN _candidate;
    END IF;
    IF _attempts > 20 THEN
      RETURN _prefix || '-' || upper(substring(encode(extensions.gen_random_bytes(8), 'hex') FROM 1 FOR 8));
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_tenant_custom_domain(_tenant_id uuid, _hostname text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _clean := regexp_replace(_clean, '^https?://', '');
  _clean := regexp_replace(_clean, '/.*$', '');

  IF _clean IS NULL OR length(_clean) < 4 OR length(_clean) > 253 THEN
    RAISE EXCEPTION 'Invalid domain length' USING ERRCODE = '22023';
  END IF;
  IF _clean !~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid domain format' USING ERRCODE = '22023';
  END IF;
  IF _clean LIKE '%churchmanagementpro.com' OR _clean LIKE '%.lovable.app' THEN
    RAISE EXCEPTION 'Use the free subdomain option for this domain' USING ERRCODE = '23514';
  END IF;

  SELECT id INTO _existing_id
  FROM public.tenant_domains
  WHERE lower(hostname) = _clean AND status <> 'removed'
  LIMIT 1;
  IF _existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'This domain is already connected to a project' USING ERRCODE = '23505';
  END IF;

  _token := 'cmp-verify=' || encode(extensions.gen_random_bytes(16), 'hex');

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
$function$;