-- 1. Prevent members from self-updating privileged fields
CREATE OR REPLACE FUNCTION public.prevent_member_privilege_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  is_staff := public.is_super_admin(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      OLD.tenant_id = public.get_user_tenant_id(auth.uid())
      AND (
        public.has_tenant_role(auth.uid(), OLD.tenant_id, 'admin'::app_role)
        OR public.has_tenant_role(auth.uid(), OLD.tenant_id, 'pastor'::app_role)
        OR public.has_tenant_role(auth.uid(), OLD.tenant_id, 'secretary'::app_role)
      )
    );

  IF NOT is_staff THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.member_type := OLD.member_type;
    NEW.branch_id := OLD.branch_id;
    NEW.tenant_id := OLD.tenant_id;
    NEW.user_id := OLD.user_id;
    NEW.member_number := OLD.member_number;
    NEW.qr_code := OLD.qr_code;
    NEW.groups := OLD.groups;
    NEW.baptism_status := OLD.baptism_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_member_privilege_self_update ON public.members;
CREATE TRIGGER trg_prevent_member_privilege_self_update
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.prevent_member_privilege_self_update();

DROP POLICY IF EXISTS "Staff and self can update own record" ON public.members;
CREATE POLICY "Staff and self can update own record"
ON public.members
FOR UPDATE
USING (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
)
WITH CHECK (
  (user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
);

-- 2. Harden public member_requests inserts
DROP POLICY IF EXISTS "Anyone can submit valid member requests" ON public.member_requests;
CREATE POLICY "Anyone can submit valid member requests"
ON public.member_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND status = 'pending'::text
  AND first_name IS NOT NULL AND length(first_name) BETWEEN 1 AND 100
  AND last_name IS NOT NULL AND length(last_name) BETWEEN 1 AND 100
  AND (email IS NULL OR length(email) <= 255)
  AND (phone IS NULL OR length(phone) <= 40)
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = tenant_id)
);

-- 3. Scope newsletter subscriber deletion/updates to the caller's tenant
DROP POLICY IF EXISTS "Tenant admins can delete subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Tenant admins can delete subscribers"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
);

DROP POLICY IF EXISTS "Tenant staff can update subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Tenant staff can update subscribers"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )
)
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )
);

-- 4. Only explicitly published status incidents are visible to the public
ALTER TABLE public.status_incidents
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Anyone can view incidents" ON public.status_incidents;
CREATE POLICY "Anyone can view published incidents"
ON public.status_incidents
FOR SELECT
TO anon, authenticated
USING (is_public = true);