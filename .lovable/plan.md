## Overview

Four new Super Admin growth features. Each is independent — can build all at once or pick subset.

---

### 1. In-App Broadcasts with Targeting

Extends the existing `platform_announcement_banners` system with **audience targeting rules** and **in-app inbox messages** (not just banners).

**Schema (new tables)**
- `broadcasts`: title, body_html, cta_label, cta_url, delivery (banner|inbox|both), severity, starts_at, ends_at, audience_rules (jsonb), created_by
- `broadcast_reads`: broadcast_id, user_id, read_at, dismissed_at

**Audience rules (jsonb)** — composable filters:
- `subscription_tier`: essentiel | professionnel | entreprise
- `subscription_status`: trial | active | past_due | canceled
- `trial_day_range`: {min, max} (e.g. day 10-14)
- `country` / `language`
- `member_count_range`: {min, max}
- `has_feature`: e.g. any specific enabled feature

**Admin UI** — `/super-admin/broadcasts`
- List, create, edit, archive
- Live "audience preview" showing matched tenant count before send
- Duplicate broadcast

**Client**
- Bell icon inbox in Layout showing unread inbox broadcasts
- Existing banner component reads from `broadcasts` where delivery in (banner, both) and audience matches current tenant

---

### 2. Referral Leaderboard + Rewards Catalog

Builds on existing `referrals` / `referral_codes` / `referral_rewards` tables.

**Schema**
- `reward_catalog`: name, description, cost_in_referrals (or cost_in_free_days), reward_type (free_month | discount | swag | feature_unlock), image_url, is_active
- `reward_redemptions`: tenant_id, reward_id, status (pending|fulfilled|denied), notes, fulfilled_at

**Tenant UI** — enhance existing `/referrals` page
- Public leaderboard (top 10 tenants by qualified referrals, opt-in only via profile flag)
- Rewards catalog grid with "Redeem" button
- Progress bar to next reward

**Super Admin UI** — `/super-admin/rewards`
- Manage catalog
- Redemption queue (approve/fulfill)

---

### 3. Annual Billing Prompt (Save 15%)

Nudge monthly subscribers to switch to yearly.

**Schema**
- `annual_upgrade_prompts`: tenant_id, shown_at, action (dismissed | upgraded | remind_later), remind_after
- (No new pricing needed — 15% yearly discount already exists per memory.)

**Logic**
- Show prompt to tenants where `subscription_interval = 'month'`, `status = 'active'`, >= 30 days on plan
- Frequency cap: max once per 14 days, snoozable
- Trigger points: after successful monthly payment, dashboard header banner, billing page CTA

**UI**
- `AnnualUpgradePrompt.tsx` modal — shows current monthly cost × 12 vs yearly with 15% off, savings amount
- One-click switch calling existing Stripe portal / subscription change flow
- Super Admin analytics tile: conversion rate

---

### 4. NPS Survey Every 90 Days

**Schema**
- `nps_surveys`: tenant_id, user_id, score (0-10), comment, category (auto: promoter|passive|detractor), submitted_at, survey_cycle (quarter identifier)
- `nps_dismissals`: user_id, dismissed_until

**Trigger**
- After login, if user is tenant admin AND last survey > 90 days ago (or never) AND not dismissed
- Non-blocking bottom-right card

**Super Admin UI** — `/super-admin/nps`
- Current NPS score (promoters% − detractors%)
- Trend chart (per quarter)
- Recent comments list with tenant context
- Filter by tier / country
- CSV export

---

## Technical Details

- All tables get `tenant_id` where relevant, RLS with `is_super_admin()` for admin ops, `authenticated` grants for user reads scoped to their tenant
- Trial-day targeting uses `subscription_trial_start` + `now()` computed in a `matches_broadcast_audience(_tenant_id, _rules jsonb)` SECURITY DEFINER function so client can preview matches
- Reward redemptions decrement an available balance (qualified referrals not yet spent); track via view rather than materialized column
- Annual upgrade uses Stripe subscription update with proration
- NPS trigger card localized (EN/FR/HT)

## Build Order Suggestion

Recommend build in this order (largest value first):
1. **Broadcasts** (biggest lift, most powerful)
2. **Annual billing prompt** (direct revenue impact)
3. **NPS survey** (fast, high signal)
4. **Referral leaderboard + rewards** (largest scope, gamification polish)

---

Confirm and I'll build all four, or tell me which subset to ship first.
