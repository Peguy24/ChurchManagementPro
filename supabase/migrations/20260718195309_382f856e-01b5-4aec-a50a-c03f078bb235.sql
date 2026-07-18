-- Prevent users from changing their own profiles.tenant_id (privilege escalation)
CREATE OR REPLACE FUNCTION public.prevent_profile_tenant_hijack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_super boolean;
BEGIN
  -- Super admins may reassign tenants (used by admin tooling)
  SELECT public.is_super_admin(auth.uid()) INTO _is_super;
  IF COALESCE(_is_super, false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- On self-insert, tenant_id must match an approved tenant_user_roles entry (or be NULL)
    IF NEW.id = auth.uid() AND NEW.tenant_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.tenant_user_roles
        WHERE user_id = NEW.id AND tenant_id = NEW.tenant_id AND is_approved = true
      ) THEN
        -- Allow the signup handler (SECURITY DEFINER trigger) which runs as postgres, not auth.uid()
        IF auth.uid() IS NOT NULL THEN
          RAISE EXCEPTION 'Cannot set profile tenant_id without an approved tenant role'
            USING ERRCODE = '42501';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id AND NEW.id = auth.uid() THEN
      RAISE EXCEPTION 'Users cannot change their own tenant_id'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_tenant_hijack ON public.profiles;
CREATE TRIGGER trg_prevent_profile_tenant_hijack
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tenant_hijack();