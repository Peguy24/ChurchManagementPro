

## Plan: Add Trial Expiry Reminder Emails

The existing `check-subscription-alerts` Edge Function only handles `active` subscriptions (paid plans). It does not query for `trial` status subscriptions. We need to add a new alert type for trial expiry reminders.

### What to change

**1. Update `supabase/functions/check-subscription-alerts/index.ts`**

- Add a new alert type `trial_expiring` to the `translations` object with EN/FR/HT translations (subject, title, body urging upgrade, CTA pointing to subscription page, footer)
- Add corresponding color scheme (e.g., blue/indigo tones to differentiate from paid expiry warnings)
- Add a new section (section 3) that queries `tenant_subscriptions` where `status = 'trial'` and `trial_ends_at IS NOT NULL`
- Calculate days until trial expiry; send reminders at **7 days**, **3 days**, and **1 day** before `trial_ends_at`
- Reuse existing helper functions (`getTenantAdminEmails`, `getTenantLanguage`, `getTenantName`, `formatDate`, `buildEmailHtml`)

### Email content (trial-specific messaging)

- **Subject**: "Your free trial expires soon" (localized)
- **Body**: "Your free trial ends on {date}. Upgrade now to keep access to all your church management features."
- **CTA**: "Upgrade Now" → links to `/settings/subscription`
- **Distinct from paid expiry**: Different wording focused on upgrading rather than renewing

### No other changes needed

- The cron job already calls this function daily, so trial reminders will be picked up automatically
- No database migration required
- No frontend changes needed

