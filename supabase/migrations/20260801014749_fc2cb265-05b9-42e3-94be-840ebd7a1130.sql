
CREATE OR REPLACE FUNCTION public.get_public_join_config(_slug text)
RETURNS TABLE(tenant_id uuid, tenant_name text, logo_url text, primary_color text, ministries jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.logo_url, t.primary_color,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) ORDER BY m.name)
      FROM public.ministries m
      WHERE m.tenant_id = t.id AND m.status = 'active'
    ), '[]'::jsonb)
  FROM public.tenants t
  WHERE t.slug = _slug
     OR (_slug ~ '^[0-9a-fA-F-]{36}$' AND t.id = _slug::uuid)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_public_join_config(text) TO anon, authenticated;

-- Ensure a member request's desired ministry belongs to the same tenant
CREATE OR REPLACE FUNCTION public.validate_member_request_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.desired_ministry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ministries m
      WHERE m.id = NEW.desired_ministry_id AND m.tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'Ministry does not belong to this church';
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Invalid church';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_member_request_tenant_trg ON public.member_requests;
CREATE TRIGGER validate_member_request_tenant_trg
BEFORE INSERT OR UPDATE ON public.member_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_member_request_tenant();
