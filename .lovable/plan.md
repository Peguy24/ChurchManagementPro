
# Church Mini-Site — Paid Add-On

Add a template-based public website for each church tenant. Instead of gating by plan tier, it's a paid **add-on** any plan can subscribe to. Tenants without the add-on see a live demo preview + upgrade CTA.

## What tenants get

A single-page public site at `churchmanagementpro.com/site/:slug` (and the existing `/t/:slug` route can link to it), built from a template with editable fields — no drag-and-drop.

Editable fields (stored in a new `tenant_websites` row):
- Church name, tagline, logo, hero image
- About / mission (rich text, short)
- Service schedule (list: day, time, description)
- Contact: address, phone, email, WhatsApp
- Social links (Facebook, Instagram, YouTube)
- Optional "Donate" button (links to existing donation flow)
- Primary color (defaults to tenant `primary_color`)
- Template choice: pick 1 of 3 preset layouts (Classic / Modern / Warm)
- Custom domain field (display-only note for now — DNS setup is manual)
- `is_published` toggle

## Pages / UI

**Tenant admin — `/website`** (sidebar entry "Church Website"):
- If add-on inactive: full-page **demo preview** of a sample church rendered with template #1, overlay CTA "Activate Church Website — $X/month" → opens Stripe checkout.
- If active: editor form with live preview pane, template picker, publish toggle.

**Public — `/site/:slug`**: renders the template using the tenant's data. SEO tags (title, description, og). Only reachable when `is_published = true` AND add-on active.

**Super Admin — `/super-admin/website-addons`**: list of tenants with add-on status (active / cancelled / trialing), manual override toggle (same pattern as `managed_by_admin` on subscriptions), MRR from add-ons.

## Commercial page

Add a new marketing section on `Commercial.tsx` — "Give your church a professional website" — with 3 template thumbnails and pricing, linking signed-in tenants to `/website`.

## Data model

New table `tenant_websites`:
- `tenant_id` (unique), `template` (enum: classic/modern/warm), `is_published`, all editable fields as JSONB `content`, `custom_domain` (nullable text), timestamps.

New table `website_addon_subscriptions`:
- `tenant_id` (unique), `status` (active/cancelled/trialing/past_due), `stripe_subscription_id`, `managed_by_admin` (bool for super-admin comp), `current_period_end`, timestamps.

RLS:
- `tenant_websites`: tenant admins read/write own row; anon read only when joined tenant has active add-on and `is_published = true` (via SECURITY DEFINER function `get_public_website(slug)`).
- `website_addon_subscriptions`: tenant admins read own; super admins full access.

Helper function `has_website_addon(_tenant_id)` → bool (checks status active OR managed_by_admin).

## Payments

Reuse existing Stripe integration. Add one new Stripe price (monthly recurring) for the add-on. New edge function `create-website-addon-checkout` and webhook branch in the existing Stripe webhook to upsert `website_addon_subscriptions`.

Pricing decision needed from you before implementation: **monthly price for the add-on** (suggested: $9/mo or $15/mo — say the word).

## Files to create/edit

Create:
- Migration: `tenant_websites`, `website_addon_subscriptions`, `has_website_addon()`, `get_public_website()`, RLS + grants.
- `src/pages/ChurchWebsite.tsx` — editor + demo/upsell states.
- `src/pages/PublicChurchSite.tsx` — public render, 3 template components.
- `src/components/website/TemplateClassic.tsx`, `TemplateModern.tsx`, `TemplateWarm.tsx`.
- `src/pages/WebsiteAddonsAdmin.tsx` — super admin management.
- `supabase/functions/create-website-addon-checkout/index.ts`.

Edit:
- `src/App.tsx` — 3 new routes (`/website`, `/site/:slug`, `/super-admin/website-addons`).
- `src/components/Layout.tsx` — sidebar entry "Church Website" (Globe icon).
- `src/pages/Commercial.tsx` + `LanguageContext.tsx` — marketing section, translations EN/FR/HT.
- Stripe webhook handler — handle add-on subscription events.

## Out of scope (explicit)

- No drag-and-drop, no multi-page sites, no blog.
- Custom domain field is captured but DNS/SSL setup is manual (documented in a follow-up).
- No image gallery beyond the hero image in v1.

## Open question before I build

**What monthly price should the add-on be?** ($9 / $15 / other)
