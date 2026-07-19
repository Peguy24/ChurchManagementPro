
CREATE OR REPLACE FUNCTION public.get_pending_super_admin_candidates()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, au.email::text, p.created_at
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE p.tenant_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur WHERE tur.user_id = p.id
    )
    AND EXISTS (
      SELECT 1 FROM public.super_admin_invitations sai
      WHERE lower(sai.email) = lower(au.email)
        AND sai.used_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role <> 'user'
    );
$$;

REVOKE ALL ON FUNCTION public.get_pending_super_admin_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_super_admin_candidates() TO authenticated;
