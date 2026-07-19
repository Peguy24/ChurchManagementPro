
# Online Giving for Tenants

Adds a public "Give" page inside the existing $15/mo Church Mini-Site add-on. Donors can give a one-time gift via Stripe (card / Apple Pay / Google Pay) or MonCash (Haiti mobile wallet). No fund picker, no recurring — kept simple for v1.

## Scope

- Only tenants with an active `website_addon_subscriptions` row get a live Give page.
- Public URL: `/site/:slug/give` (also linked as a "Donate" button on the mini-site).
- Tenant admin configures payout accounts in Church Settings → Online Giving.
- Every successful donation is auto-inserted into the existing `donations` table so it appears in the tenant's finance module.

## Payout model

Each church receives funds directly — the platform is not a merchant of record.

- **Stripe:** Stripe Connect (Standard accounts). Each tenant onboards their own Stripe account; funds settle to their bank. Platform can optionally take an application fee (default 0%).
- **MonCash:** Each tenant enters their MonCash business `client_id` / `client_secret` (encrypted in DB). Payments hit their MonCash merchant account directly.

## Tenant configuration UI

New tab in `ChurchSettings.tsx` → "Online Giving":
- Toggle: Enable online giving (requires website add-on).
- Stripe: "Connect Stripe account" button → OAuth flow → stores `stripe_account_id`. Shows connected status + "Disconnect".
- MonCash: form for `moncash_client_id` + `moncash_client_secret` + Sandbox/Live toggle.
- Minimum amount, suggested amounts (e.g. 10 / 25 / 50 / 100), currency (uses tenant currency), thank-you message (localized), optional cover image.

## Public Give page (`/site/:slug/give`)

- Tenant branding (logo, primary color) from `get_public_website`.
- Amount input + suggested chips, donor name (optional), email (required for receipt), optional message.
- Payment method radio: Card (Stripe) / MonCash — only shows methods the tenant enabled.
- Submit → calls `create-donation-checkout` edge function → redirects to Stripe Checkout or MonCash payment URL.
- Success page `/site/:slug/give/success` and cancel page.

## Recording donations

Both providers post back to webhooks. On success:
- Insert into `donations` (tenant_id, amount, donation_type='online', payment_method='card'|'moncash', donor name in `notes`, `description`='Online giving').
- If the tenant has a default cash register / bank account for online giving (set in config), credit its balance; otherwise leave unlinked for the treasurer to reconcile.
- Send confirmation email to donor via existing Resend setup (trilingual FR/EN/HT based on browser lang).
- Fire `platform_notifications` insert `new_online_donation` for tenant admins (uses existing realtime infra).

## Super Admin

Nothing new required — existing `WebsiteAddonsAdmin` already gates access. Add a small "Online giving totals" widget on the tenant detail view later (out of scope for v1).

## Technical Details

**Migration**
- New table `tenant_giving_settings` (tenant_id PK, enabled, stripe_account_id, moncash_client_id, moncash_client_secret_encrypted, moncash_env, min_amount, suggested_amounts jsonb, thank_you_message jsonb, cover_image_url, default_cash_register_id, default_bank_account_id).
- Standard 4-step: CREATE → GRANT (authenticated + service_role, no anon) → RLS → policies (tenant admins manage own row; `service_role` full).
- Add SECURITY DEFINER function `get_public_giving_config(_slug text)` returning only public-safe fields (enabled providers, amounts, message, cover, branding) — no secrets.
- Add columns to `donations`: none needed; reuse `payment_method` values `card` / `moncash` and add `donation_type='online'` via existing free-text.
- Encrypt MonCash secret using pgsodium or store in Supabase Vault; edge function reads via service role.

**Edge functions** (all with `verify_jwt = false` where public)
- `stripe-connect-oauth` — starts Stripe Connect Standard OAuth, stores `stripe_account_id` on callback. Requires tenant admin JWT.
- `create-donation-checkout` (public) — input: `{ slug, amount, method, donor_name?, donor_email, message? }`. Loads config via `get_public_giving_config`, validates amount ≥ min, creates Stripe Checkout Session with `payment_intent_data.transfer_data.destination = tenant.stripe_account_id` OR calls MonCash `CreatePayment` API and returns redirect URL. Rate-limited + honeypot like the contact form.
- `stripe-giving-webhook` (public, signature-verified) — on `checkout.session.completed`, insert donation row, update balances, send confirmation email, insert notification.
- `moncash-giving-webhook` (public) — polls/receives MonCash `transactionId`, verifies via MonCash API, then same insert flow.

**Frontend**
- `src/pages/PublicGivingPage.tsx` — the donor-facing page.
- `src/pages/GivingSuccess.tsx` / `GivingCancel.tsx`.
- `src/components/ChurchSettings/OnlineGivingSettings.tsx` — admin config UI.
- Add "Donate" button/section to `SiteTemplates.tsx` when giving is enabled.
- Routes in `App.tsx`: `/site/:slug/give`, `/site/:slug/give/success`, `/site/:slug/give/cancel`.

**Secrets needed**
- `STRIPE_SECRET_KEY` (platform key, likely already present) + `STRIPE_CONNECT_CLIENT_ID` (new — user must add from Stripe Dashboard → Connect settings).
- `STRIPE_WEBHOOK_SECRET_GIVING` (new — from webhook endpoint we register).
- `MONCASH_ENCRYPTION_KEY` (generated) for encrypting per-tenant MonCash secrets at rest.

**Fees**
- v1: no platform fee. Comment in code shows where to add `application_fee_amount` later.

**Out of scope (call out to user)**
- Recurring donations, fund/category picker, donor accounts, tax receipt PDFs from online gifts (existing fiscal receipt flow already covers year-end), refunds UI.

## Rollout order

1. Migration + settings UI (admin can save config, no live payments yet).
2. Stripe Connect OAuth + Stripe checkout + webhook end-to-end.
3. MonCash integration.
4. Public Give page + mini-site "Donate" button.
5. Confirmation emails + realtime notifications.
