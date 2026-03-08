
CREATE TABLE public.platform_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'general',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_email text,
  ip_address text
);

ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view activity logs"
  ON public.platform_activity_logs FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can insert activity logs"
  ON public.platform_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_platform_activity_logs_created_at ON public.platform_activity_logs(created_at DESC);
CREATE INDEX idx_platform_activity_logs_event_category ON public.platform_activity_logs(event_category);
CREATE INDEX idx_platform_activity_logs_tenant_id ON public.platform_activity_logs(tenant_id);
