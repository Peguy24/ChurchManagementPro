-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule birthday notifications - runs daily at 8:00 AM
SELECT cron.schedule(
  'send-birthday-notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-birthday-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod2hidG1ueWhoY2Vpd2RjZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODUxODQsImV4cCI6MjA3OTE2MTE4NH0.wETFan_eLt8wdCMuOsbGSU5ADyBcEXI-tWlOKLq6aHQ"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule event reminders - runs daily at 6:00 PM (day before service)
SELECT cron.schedule(
  'send-event-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-event-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod2hidG1ueWhoY2Vpd2RjZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODUxODQsImV4cCI6MjA3OTE2MTE4NH0.wETFan_eLt8wdCMuOsbGSU5ADyBcEXI-tWlOKLq6aHQ"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule attendance alerts - runs every Monday at 9:00 AM
SELECT cron.schedule(
  'check-attendance-alerts',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/check-attendance-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlod2hidG1ueWhoY2Vpd2RjZnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODUxODQsImV4cCI6MjA3OTE2MTE4NH0.wETFan_eLt8wdCMuOsbGSU5ADyBcEXI-tWlOKLq6aHQ"}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);