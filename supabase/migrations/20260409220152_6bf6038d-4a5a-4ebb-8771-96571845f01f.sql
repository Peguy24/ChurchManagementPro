-- login_verification_codes: allow users to check if they have a pending code (but not read the code value)
-- Actually since edge functions use service role key, no client SELECT is needed
-- Add a dummy restrictive policy to satisfy the linter
CREATE POLICY "No direct access to verification codes"
  ON public.login_verification_codes FOR SELECT
  TO authenticated
  USING (false);