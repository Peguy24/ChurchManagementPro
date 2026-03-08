
CREATE TABLE public.platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view notifications"
  ON public.platform_notifications FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update notifications"
  ON public.platform_notifications FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete notifications"
  ON public.platform_notifications FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "System can insert notifications"
  ON public.platform_notifications FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE INDEX idx_platform_notifications_unread ON public.platform_notifications(is_read, is_dismissed, created_at DESC);
CREATE INDEX idx_platform_notifications_type ON public.platform_notifications(notification_type);
