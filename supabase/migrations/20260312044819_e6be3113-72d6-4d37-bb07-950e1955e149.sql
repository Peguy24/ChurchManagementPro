
CREATE TABLE public.login_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own codes (for verification)
CREATE POLICY "Users can read own codes" ON public.login_verification_codes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to insert/update (edge function)
-- No insert/update policy for authenticated users - only edge functions with service role can manage codes

-- Index for fast lookups
CREATE INDEX idx_login_verification_codes_user_email ON public.login_verification_codes(user_id, email, used_at);
CREATE INDEX idx_login_verification_codes_expiry ON public.login_verification_codes(expires_at) WHERE used_at IS NULL;

-- Auto-cleanup old codes (optional: via cron or manual)
