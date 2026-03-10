
-- Fix validate_admin_invitation to include tenant_id in return
CREATE OR REPLACE FUNCTION public.validate_admin_invitation(_token text)
RETURNS TABLE(id uuid, email text, tenant_id uuid, expires_at timestamptz, used_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, email, tenant_id, expires_at, used_at
  FROM public.admin_invitations
  WHERE token = _token
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;
$$;
