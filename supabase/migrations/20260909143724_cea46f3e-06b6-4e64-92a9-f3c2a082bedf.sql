CREATE TABLE IF NOT EXISTS public.verified_login_sessions (
  session_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.verified_login_sessions TO authenticated;
GRANT ALL ON public.verified_login_sessions TO service_role;

ALTER TABLE public.verified_login_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verified sessions" ON public.verified_login_sessions;
CREATE POLICY "Users can view their own verified sessions"
ON public.verified_login_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_verified_login_sessions_user ON public.verified_login_sessions(user_id);

-- Returns true when the caller's current session has completed the emailed login code,
-- or when the check does not apply (service role, other users, non-session tokens).
CREATE OR REPLACE FUNCTION public.session_mfa_verified(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims json;
  sid uuid;
BEGIN
  IF _user_id IS NULL THEN
    RETURN true;
  END IF;

  -- Only applies to the identity making the request (not to lookups about other users)
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RETURN true;
  END IF;

  BEGIN
    claims := nullif(current_setting('request.jwt.claims', true), '')::json;
  EXCEPTION WHEN others THEN
    RETURN true;
  END;

  IF claims IS NULL THEN
    RETURN true;
  END IF;

  IF coalesce(claims->>'role', '') = 'service_role' THEN
    RETURN true;
  END IF;

  sid := nullif(claims->>'session_id', '')::uuid;
  IF sid IS NULL THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.verified_login_sessions v
    WHERE v.session_id = sid AND v.user_id = _user_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.session_mfa_verified(uuid) FROM anon;

-- Gate privileged role checks behind a verified session
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _role IS NULL THEN false
    WHEN _role = 'admin'::app_role AND NOT public.session_mfa_verified(_user_id) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.has_platform_role(_user_id uuid, _role platform_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _role IS NULL THEN false
    WHEN NOT public.session_mfa_verified(_user_id) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.platform_user_roles WHERE user_id = _user_id AND role = _role
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.has_any_platform_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN NOT public.session_mfa_verified(_user_id) THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.platform_user_roles WHERE user_id = _user_id
    ) OR has_role(_user_id, 'admin'::app_role)
  END;
$function$;

CREATE OR REPLACE FUNCTION public.has_platform_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _permission IS NULL THEN false
    WHEN NOT public.session_mfa_verified(_user_id) THEN false
    WHEN has_role(_user_id, 'admin'::app_role) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.platform_user_roles pur
      JOIN public.platform_permissions pp ON pur.role = pp.role
      WHERE pur.user_id = _user_id AND pp.permission = _permission
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _role = 'admin'::app_role AND NOT public.session_mfa_verified(_user_id) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.tenant_user_roles
      WHERE user_id = _user_id
        AND tenant_id = _tenant_id
        AND role = _role
        AND is_approved = true
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN NOT public.session_mfa_verified(_user_id) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.tenant_user_roles tur
      JOIN public.profiles p ON p.id = _user_id
      WHERE tur.user_id = _user_id
        AND tur.role = 'admin'
        AND tur.is_approved = true
        AND p.tenant_id IS NOT NULL
        AND tur.tenant_id = p.tenant_id
        AND tur.tenant_id = public.get_user_tenant_id(_user_id)
    )
  END;
$function$;