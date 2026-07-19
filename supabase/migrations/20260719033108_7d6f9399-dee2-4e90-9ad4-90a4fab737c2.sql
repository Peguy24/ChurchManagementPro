
-- Allow all users (anon + authenticated) to read the platform_settings rows
-- that must be visible client-side (maintenance mode, feature flags, plan limits, trial config).
-- Sensitive/admin-only rows remain restricted by the existing super admin policy.
CREATE POLICY "Public read of client-visible platform settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (setting_key IN (
  'maintenance_mode',
  'feature_flags',
  'trial_duration_days',
  'trial_plan_limits',
  'plan_gratuit_limits',
  'plan_essentiel_limits',
  'plan_professionnel_limits',
  'plan_entreprise_limits',
  'welcome_message'
));

GRANT SELECT ON public.platform_settings TO anon, authenticated;
