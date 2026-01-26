-- Drop the overly permissive INSERT policy on financial_audit_logs
-- The SECURITY DEFINER trigger function log_financial_audit() will still work
-- because it bypasses RLS policies
DROP POLICY IF EXISTS "System can insert audit logs" ON public.financial_audit_logs;

-- Note: The existing SELECT policy "Admins can view audit logs" remains in place
-- and properly restricts read access to admin users only