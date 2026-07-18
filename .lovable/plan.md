## NPS Enhancements — 5 Features

### 1. Email survey (catch inactive users)
- New edge function `send-nps-survey` (server-side): finds tenant admins eligible per the same 90-day cadence as the in-app prompt, sends a branded email with a one-click score link (0–10) that deep-links to `/nps?score=N&token=…`.
- Register React Email template `nps-survey` in `_shared/transactional-email-templates/` (trilingual per user locale from `profiles.language`).
- Add "Send email survey now" button + last-sent timestamp in `NpsAdmin.tsx` (manual trigger). Also schedule via `pg_cron` weekly to catch users who haven't logged in recently (checks last sign-in).
- Add `nps_email_sends` table (user_id, sent_at, cycle) so we don't double-email in the same cycle.

### 2. Detractor auto-ticket + super-admin alert
- DB trigger `on_nps_detractor_submitted` on `nps_surveys AFTER INSERT`:
  - If `score ≤ 6` **and** `comment` present → insert `support_tickets` row (category `nps_detractor`, priority `high`, subject "Detractor feedback from <tenant>", message = comment + score context).
  - Insert `platform_notifications` row (`nps_detractor` type) so bell + realtime already work.
- New edge function `notify-detractor` invoked by trigger via `pg_net`: emails all super admins who opted in (reuse `get_contact_message_email_recipients` pattern → add new prefs column `nps_detractor_channel` to `super_admin_notification_prefs`).

### 3. Admin dashboard segmentation
- Update `NpsAdmin.tsx`:
  - Add filter bar: **Plan tier** (Essentiel / Professionnel / Entreprise / Trial / All), **Country** (dropdown from distinct tenant countries), **Tenant size** (member count buckets: <50, 50–200, 200–500, 500+).
  - Fetch enriched view via new SQL function `get_nps_responses_filtered(_plan, _country, _min_members, _max_members)` that joins `nps_surveys`, `tenants`, `tenant_subscriptions`, and `members` count.
  - Recompute NPS score, promoters/passives/detractors, and trend from the filtered result set client-side.
  - CSV export respects active filters.

### 4. Response webhook (detractor alert)
- Covered by #2: emails Super Admins per their notification prefs on every detractor submission. No external Slack — reuses existing Resend/`send-transactional-email` infra.
- Optional `SLACK_WEBHOOK_URL` secret support: if present, `notify-detractor` also POSTs to Slack. Skipped silently if not configured.

### 5. Public NPS badge on Commercial page
- New SQL function `get_public_nps_stats()` (SECURITY DEFINER, public read via `anon`): returns `{ score, total_responses, promoters_pct }` for **last 12 months only if `total_responses ≥ 20`**, otherwise `null`.
- New component `<PublicNpsBadge />` rendered in `Commercial.tsx` above/near testimonials: shows score, "Based on N verified church responses", subtle green/yellow/red accent.
- Hidden entirely below the 20-response threshold (no "0 reviews" state).

### Technical Details
- Migrations (single file):
  - `CREATE TABLE nps_email_sends` + GRANTs + RLS.
  - `ALTER TABLE super_admin_notification_prefs ADD COLUMN nps_detractor_channel text DEFAULT 'both'`.
  - `CREATE FUNCTION get_nps_responses_filtered(...)`.
  - `CREATE FUNCTION get_public_nps_stats()` (grant `SELECT`/`EXECUTE` to `anon, authenticated`).
  - `CREATE FUNCTION on_nps_detractor_submitted()` + trigger.
  - `pg_cron` weekly job for `send-nps-survey`.
- Edge functions:
  - `send-nps-survey` — batch enqueue nps-survey template.
  - `notify-detractor` — email + optional Slack webhook.
- React Email template: `nps-survey.tsx`.
- Frontend edits:
  - `src/pages/NpsAdmin.tsx` — filters, manual send-email button.
  - `src/pages/Commercial.tsx` — mount `<PublicNpsBadge />`.
  - `src/components/PublicNpsBadge.tsx` — new.
  - `src/pages/Dashboard.tsx` (or wherever `/nps` handles landing) — accept `?score=N&token=…` from email link and auto-open NpsPrompt pre-filled.

### Out of scope
- No standalone Slack connector setup unless user later provides a webhook URL.
- No changes to existing in-app NpsPrompt cadence.
