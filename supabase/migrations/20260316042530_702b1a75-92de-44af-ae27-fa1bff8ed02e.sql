
-- Remove all old broken cron jobs for birthday, event reminder, and attendance alerts
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobid IN (1, 2, 3, 8, 9, 10);

-- Insert CRON_SECRET into vault using the vault API function
SELECT vault.create_secret(gen_random_uuid()::text, 'CRON_SECRET', 'Cron job authentication secret');

-- Recreate birthday notifications cron job (daily at 07:00 UTC)
SELECT cron.schedule(
  'send-birthday-notifications',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-birthday-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Recreate event reminders cron job (daily at 18:00 UTC)
SELECT cron.schedule(
  'send-event-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/send-event-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);

-- Recreate attendance alerts cron job (weekly Monday at 09:00 UTC)
SELECT cron.schedule(
  'check-attendance-alerts',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://ihwhbtmnyhhceiwdcfsc.supabase.co/functions/v1/check-attendance-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
