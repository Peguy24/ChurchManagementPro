
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
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
$$;
