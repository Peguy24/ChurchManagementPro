
-- Drop the newly created cron jobs that use CRON_SECRET from vault (value unknown to edge functions)
SELECT cron.unschedule('send-birthday-notifications');
SELECT cron.unschedule('send-event-reminders');
SELECT cron.unschedule('check-attendance-alerts');

-- Recreate using email_queue_service_role_key from vault (already populated)
SELECT cron.schedule(
  'send-birthday-notifications',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-birthday-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'send-event-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-event-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'check-attendance-alerts',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/check-attendance-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
