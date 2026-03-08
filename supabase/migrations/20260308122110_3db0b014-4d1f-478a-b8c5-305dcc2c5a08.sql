CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  setting_category text NOT NULL DEFAULT 'general',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

INSERT INTO public.platform_settings (setting_key, setting_value, setting_category, description) VALUES
  ('trial_duration_days', '14', 'trial', 'Default trial duration in days'),
  ('trial_plan_limits', '{"max_members": 50, "max_branches": 1, "max_users": 2, "max_storage_mb": 100}', 'trial', 'Default limits during trial period'),
  ('plan_gratuit_limits', '{"max_members": 100, "max_branches": 1, "max_users": 3, "max_storage_mb": 200}', 'plans', 'Limits for Gratuit plan'),
  ('plan_essentiel_limits', '{"max_members": 500, "max_branches": 3, "max_users": 10, "max_storage_mb": 1000}', 'plans', 'Limits for Essentiel plan'),
  ('plan_professionnel_limits', '{"max_members": 2000, "max_branches": 10, "max_users": 50, "max_storage_mb": 5000}', 'plans', 'Limits for Professionnel plan'),
  ('plan_entreprise_limits', '{"max_members": -1, "max_branches": -1, "max_users": -1, "max_storage_mb": -1}', 'plans', 'Limits for Entreprise plan (-1 = unlimited)'),
  ('feature_flags', '{"smart_insights": true, "bulk_communication": true, "inventory_management": true, "bank_reconciliation": true, "event_registrations": true, "member_cards": true, "custom_fields": true, "salary_management": true}', 'features', 'Global feature flags'),
  ('email_sender_name', '"Church Management Pro"', 'email', 'Default email sender name'),
  ('email_sender_address', '"noreply@churchmanagementpro.com"', 'email', 'Default email sender address'),
  ('maintenance_mode', 'false', 'system', 'Enable maintenance mode platform-wide'),
  ('welcome_message', '"Welcome to Church Management Pro!"', 'system', 'Default welcome message for new tenants');