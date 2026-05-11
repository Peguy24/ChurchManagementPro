CREATE TYPE public.contact_notif_channel AS ENUM ('toast', 'email', 'both', 'none');

CREATE TABLE public.super_admin_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_message_channel public.contact_notif_channel NOT NULL DEFAULT 'both',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admin_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view own prefs"
  ON public.super_admin_notification_prefs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins insert own prefs"
  ON public.super_admin_notification_prefs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update own prefs"
  ON public.super_admin_notification_prefs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND public.is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_super_admin_prefs_updated
  BEFORE UPDATE ON public.super_admin_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Helper: list super admin emails wanting email-channel for contact messages
CREATE OR REPLACE FUNCTION public.get_contact_message_email_recipients()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH supers AS (
    SELECT user_id FROM public.platform_user_roles WHERE role = 'super_admin'
    UNION
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  )
  SELECT s.user_id, u.email::text
  FROM supers s
  JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.super_admin_notification_prefs p ON p.user_id = s.user_id
  WHERE u.email IS NOT NULL
    AND COALESCE(p.contact_message_channel, 'both') IN ('email', 'both');
$$;

REVOKE EXECUTE ON FUNCTION public.get_contact_message_email_recipients() FROM anon, authenticated;