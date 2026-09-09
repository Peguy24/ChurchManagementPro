
-- 1) financial_audit_logs: hide ip_address from client roles (column-level grants)
REVOKE SELECT ON public.financial_audit_logs FROM authenticated;
REVOKE SELECT ON public.financial_audit_logs FROM anon;
GRANT SELECT (id, entity_type, entity_id, action, old_values, new_values, user_id, user_email, created_at, tenant_id)
  ON public.financial_audit_logs TO authenticated;
GRANT ALL ON public.financial_audit_logs TO service_role;

-- 2) members: branch-scoped read requires an approved staff/volunteer role
DROP POLICY IF EXISTS "Approved tenant staff can view members" ON public.members;
CREATE POLICY "Approved tenant staff can view members"
ON public.members
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND is_approved_tenant_user(auth.uid(), tenant_id)
    AND (
      has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
      OR (
        branch_id IS NOT NULL
        AND get_user_branch_id(auth.uid()) IS NOT NULL
        AND branch_id = get_user_branch_id(auth.uid())
        AND has_tenant_role(auth.uid(), tenant_id, 'volunteer'::app_role)
      )
    )
  )
);

-- 3) profiles: block any non-super-admin tenant_id reassignment (including other users' profiles)
CREATE OR REPLACE FUNCTION public.prevent_profile_tenant_hijack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super boolean;
BEGIN
  SELECT public.is_super_admin(auth.uid()) INTO _is_super;
  IF COALESCE(_is_super, false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tenant_id IS NOT NULL AND auth.uid() IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.tenant_user_roles
        WHERE user_id = NEW.id AND tenant_id = NEW.tenant_id AND is_approved = true
      ) THEN
        RAISE EXCEPTION 'Cannot set profile tenant_id without an approved tenant role'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Only platform owners can change a profile tenant_id'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
