-- Add card customization settings
INSERT INTO public.church_settings (setting_key, setting_value) VALUES
  ('card_primary_color', '#3B82F6'),
  ('card_secondary_color', '#1E40AF'),
  ('card_text_color', '#FFFFFF'),
  ('card_show_logo', 'true'),
  ('card_church_name_on_card', 'true')
ON CONFLICT (setting_key) DO NOTHING;