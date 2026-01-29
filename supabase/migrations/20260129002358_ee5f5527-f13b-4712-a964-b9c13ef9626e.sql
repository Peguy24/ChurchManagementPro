
-- Remove the incorrect unique constraint on setting_key only
-- This constraint prevents multiple tenants from having the same setting key
-- The correct constraint church_settings_tenant_setting_unique (tenant_id, setting_key) already exists

ALTER TABLE public.church_settings 
DROP CONSTRAINT IF EXISTS church_settings_setting_key_key;
