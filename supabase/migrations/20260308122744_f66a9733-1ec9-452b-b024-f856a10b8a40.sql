
-- Seed default platform settings with plan limits matching the subscription system
INSERT INTO public.platform_settings (setting_key, setting_value, setting_category, description) VALUES
  ('trial_duration_days', '14', 'trial', 'Default trial duration in days'),
  ('trial_plan_limits', '{"max_members": 50, "max_branches": 1, "max_users": 2, "max_storage_mb": 100}', 'trial', 'Resource limits during trial period'),
  ('plan_gratuit_limits', '{"max_members": 100, "max_branches": 1, "max_users": 3, "max_storage_mb": 200}', 'plans', 'Gratuit plan resource limits'),
  ('plan_essentiel_limits', '{"max_members": 200, "max_branches": 1, "max_users": 5, "max_storage_mb": 500}', 'plans', 'Essentiel plan resource limits'),
  ('plan_professionnel_limits', '{"max_members": 1000, "max_branches": 3, "max_users": 15, "max_storage_mb": 2000}', 'plans', 'Professionnel plan resource limits'),
  ('plan_entreprise_limits', '{"max_members": -1, "max_branches": -1, "max_users": -1, "max_storage_mb": 10000}', 'plans', 'Entreprise plan resource limits (-1 = unlimited)'),
  ('feature_flags', '{"smart_insights": true, "bulk_communication": true, "inventory_management": true, "bank_reconciliation": true, "event_registrations": true, "member_cards": true, "custom_fields": true, "salary_management": true}', 'features', 'Global feature flags'),
  ('maintenance_mode', 'false', 'features', 'Enable maintenance mode'),
  ('email_sender_name', '"Church Management Pro"', 'email', 'Default email sender name'),
  ('email_sender_address', '"noreply@churchmanagementpro.com"', 'email', 'Default email sender address'),
  ('welcome_message', '"Welcome to Church Management Pro!"', 'email', 'Default welcome message for new churches')
ON CONFLICT (setting_key) DO NOTHING;
