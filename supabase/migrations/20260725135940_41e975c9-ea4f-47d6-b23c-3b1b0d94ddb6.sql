CREATE TABLE public.ai_assistant_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  message_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up','down')),
  comment TEXT,
  question TEXT,
  answer TEXT,
  assistant_role TEXT,
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistant_feedback TO authenticated;
GRANT ALL ON public.ai_assistant_feedback TO service_role;

ALTER TABLE public.ai_assistant_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI feedback"
  ON public.ai_assistant_feedback FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all AI feedback"
  ON public.ai_assistant_feedback FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX idx_ai_assistant_feedback_created_at ON public.ai_assistant_feedback (created_at DESC);

CREATE TRIGGER update_ai_assistant_feedback_updated_at
  BEFORE UPDATE ON public.ai_assistant_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();