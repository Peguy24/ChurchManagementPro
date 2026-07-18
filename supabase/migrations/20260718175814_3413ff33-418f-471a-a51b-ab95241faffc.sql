
-- 1. custom_field_values: drop the permissive ALL policy
DROP POLICY IF EXISTS "Tenant users manage own field values" ON public.custom_field_values;

-- 2. storage: tighten member-documents SELECT to staff roles
DROP POLICY IF EXISTS "Tenant staff can view member documents files" ON storage.objects;
CREATE POLICY "Tenant staff can view member documents files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'member-documents'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'admin'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), get_user_tenant_id(auth.uid()), 'secretary'::app_role)
  )
);

-- 3. members: replace global-role UPDATE policy with tenant-scoped checks
DROP POLICY IF EXISTS "Staff and self can update own record" ON public.members;
CREATE POLICY "Staff and self can update own record"
ON public.members
FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
    )
  )
);
