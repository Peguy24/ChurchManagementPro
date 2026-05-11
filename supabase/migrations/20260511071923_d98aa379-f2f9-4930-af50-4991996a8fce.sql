
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  ip_address text,
  user_agent text,
  status text NOT NULL DEFAULT 'new',
  handled_at timestamptz,
  handled_by uuid,
  handled_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (the edge function uses service role anyway, but allow as defense in depth)
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (status = 'new' AND handled_at IS NULL AND handled_by IS NULL);

CREATE POLICY "Super admins can view contact messages"
  ON public.contact_messages FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update contact messages"
  ON public.contact_messages FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete contact messages"
  ON public.contact_messages FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
