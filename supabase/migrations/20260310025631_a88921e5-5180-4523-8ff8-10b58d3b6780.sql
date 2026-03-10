
CREATE OR REPLACE FUNCTION public.validate_super_admin_invitation(_token text)
RETURNS TABLE(id uuid, email text, expires_at timestamptz, used_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, email, expires_at, used_at
  FROM public.super_admin_invitations
  WHERE token = _token
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;
