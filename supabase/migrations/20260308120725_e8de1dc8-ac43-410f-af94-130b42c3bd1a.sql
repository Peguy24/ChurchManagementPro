
-- Platform announcements table for bulk communication
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  announcement_type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  sent_at timestamptz,
  sent_by uuid,
  recipient_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage announcements"
  ON public.platform_announcements
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
