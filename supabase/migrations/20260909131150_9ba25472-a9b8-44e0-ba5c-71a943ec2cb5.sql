-- 1. Inventory photos: restrict viewing to approved staff
DROP POLICY IF EXISTS "Tenant users can view inventory photos" ON storage.objects;
CREATE POLICY "Staff can view inventory photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'inventory-photos'
  AND (storage.foldername(name))[1] = (get_user_tenant_id(auth.uid()))::text
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = auth.uid()
        AND tur.is_approved = true
        AND tur.role = ANY (ARRAY['admin'::app_role,'pastor'::app_role,'secretary'::app_role,'treasurer'::app_role])
    )
  )
);

-- 2. Email infra tables: replace auth.role() text checks with role-targeted policies
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Backend manages send log" ON public.email_send_log FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Backend manages unsubscribe tokens" ON public.email_unsubscribe_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Backend manages suppressed emails" ON public.suppressed_emails FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON public.email_send_log FROM anon, authenticated;
REVOKE ALL ON public.email_unsubscribe_tokens FROM anon, authenticated;
REVOKE ALL ON public.suppressed_emails FROM anon, authenticated;
GRANT ALL ON public.email_send_log TO service_role;
GRANT ALL ON public.email_unsubscribe_tokens TO service_role;
GRANT ALL ON public.suppressed_emails TO service_role;

-- 3. Member requests: cap all free-text PII fields on public intake
DROP POLICY IF EXISTS "Anyone can submit valid member requests" ON public.member_requests;
CREATE POLICY "Anyone can submit valid member requests"
ON public.member_requests FOR INSERT TO anon, authenticated
WITH CHECK (
  tenant_id IS NOT NULL
  AND status = 'pending'
  AND first_name IS NOT NULL AND length(first_name) BETWEEN 1 AND 100
  AND last_name IS NOT NULL AND length(last_name) BETWEEN 1 AND 100
  AND (email IS NULL OR length(email) <= 255)
  AND (phone IS NULL OR length(phone) <= 40)
  AND (emergency_phone IS NULL OR length(emergency_phone) <= 40)
  AND (gender IS NULL OR length(gender) <= 30)
  AND (marital_status IS NULL OR length(marital_status) <= 30)
  AND (baptism_status IS NULL OR length(baptism_status) <= 50)
  AND (spouse_name IS NULL OR length(spouse_name) <= 200)
  AND (origin_church IS NULL OR length(origin_church) <= 200)
  AND (academic_formation IS NULL OR length(academic_formation) <= 500)
  AND (professional_formation IS NULL OR length(professional_formation) <= 500)
  AND (children_names IS NULL OR length(children_names) <= 500)
  AND (christian_experience IS NULL OR length(christian_experience) <= 2000)
  AND (message IS NULL OR length(message) <= 2000)
  AND (number_of_children IS NULL OR (number_of_children >= 0 AND number_of_children <= 30))
  AND (address IS NULL OR length(address::text) <= 1000)
  AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = member_requests.tenant_id)
);