CREATE OR REPLACE FUNCTION public.mark_admin_invitation_used(_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.admin_invitations
  SET used_at = now()
  WHERE id = _invitation_id
    AND used_at IS NULL;
END;
$$;