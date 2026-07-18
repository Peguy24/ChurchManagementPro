
CREATE TABLE public.impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  super_admin_email TEXT,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reason TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, UPDATE ON public.impersonation_sessions TO authenticated;
GRANT ALL ON public.impersonation_sessions TO service_role;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view impersonation sessions"
  ON public.impersonation_sessions FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create impersonation sessions"
  ON public.impersonation_sessions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND super_admin_id = auth.uid());

CREATE POLICY "Super admins can end their impersonation sessions"
  ON public.impersonation_sessions FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) AND super_admin_id = auth.uid())
  WITH CHECK (public.is_super_admin(auth.uid()) AND super_admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_impersonation_super_admin ON public.impersonation_sessions(super_admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant ON public.impersonation_sessions(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_activity_created_category ON public.platform_activity_logs(created_at DESC, event_category);
CREATE INDEX IF NOT EXISTS idx_email_send_log_msg_created ON public.email_send_log(message_id, created_at DESC);
