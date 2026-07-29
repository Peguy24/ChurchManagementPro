CREATE TABLE public.self_checkin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  secret TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  venue_lat DOUBLE PRECISION,
  venue_lng DOUBLE PRECISION,
  radius_m INTEGER NOT NULL DEFAULT 200,
  require_location BOOLEAN NOT NULL DEFAULT true,
  is_open BOOLEAN NOT NULL DEFAULT true,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  checkin_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_self_checkin_sessions_event ON public.self_checkin_sessions(event_id);
CREATE UNIQUE INDEX idx_self_checkin_sessions_open_event ON public.self_checkin_sessions(event_id) WHERE is_open;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_checkin_sessions TO authenticated;
GRANT ALL ON public.self_checkin_sessions TO service_role;

ALTER TABLE public.self_checkin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant staff can view self checkin sessions"
ON public.self_checkin_sessions FOR SELECT TO authenticated
USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins can create self checkin sessions"
ON public.self_checkin_sessions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
  )
);

CREATE POLICY "Tenant admins can update self checkin sessions"
ON public.self_checkin_sessions FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    public.has_tenant_role(auth.uid(), tenant_id, 'admin')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor')
    OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary')
  )
)
WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can delete self checkin sessions"
ON public.self_checkin_sessions FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.has_tenant_role(auth.uid(), tenant_id, 'admin')
);

CREATE TRIGGER update_self_checkin_sessions_updated_at
BEFORE UPDATE ON public.self_checkin_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS location_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS self_checkin_session_id UUID REFERENCES public.self_checkin_sessions(id) ON DELETE SET NULL;

ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_scan_method_check;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_scan_method_check
  CHECK (scan_method = ANY (ARRAY['manual'::text, 'qr_scan'::text, 'self_checkin'::text]));

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_member_event_day
  ON public.attendance_records(member_id, event_id, event_date)
  WHERE event_id IS NOT NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.self_checkin_sessions;