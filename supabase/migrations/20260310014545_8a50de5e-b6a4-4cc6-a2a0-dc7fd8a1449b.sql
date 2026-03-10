
-- Fix platform_activity_logs: restrict INSERT to user's own logs
DROP POLICY IF EXISTS "Authenticated can insert activity logs" ON public.platform_activity_logs;
CREATE POLICY "Authenticated can insert own activity logs"
ON public.platform_activity_logs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix event_registrations: validate required fields
DROP POLICY IF EXISTS "Anyone can register for events" ON public.event_registrations;
CREATE POLICY "Anyone can register for events with valid data"
ON public.event_registrations FOR INSERT TO anon, authenticated
WITH CHECK (tenant_id IS NOT NULL AND event_id IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL);

-- Fix member_requests: validate required fields and enforce pending status
DROP POLICY IF EXISTS "Anyone can submit member requests" ON public.member_requests;
CREATE POLICY "Anyone can submit valid member requests"
ON public.member_requests FOR INSERT TO anon, authenticated
WITH CHECK (tenant_id IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL AND status = 'pending');

-- Fix tenant_requests: validate required fields and enforce pending status
DROP POLICY IF EXISTS "Anyone can submit a request" ON public.tenant_requests;
CREATE POLICY "Anyone can submit a valid request"
ON public.tenant_requests FOR INSERT TO public
WITH CHECK (church_name IS NOT NULL AND contact_name IS NOT NULL AND contact_email IS NOT NULL AND status = 'pending');
