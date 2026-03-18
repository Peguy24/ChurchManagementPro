

## Plan: Add "Effect Timing" Indicator to Discount Panel

### What changes

**1. Add an "Effect" column to the Active Discounts table** showing when each discount takes effect:
- **"Immediate"** (green badge) — for `free` type discounts (bypasses Stripe, activates directly in DB)
- **"Next Renewal"** (amber badge) — for `percentage` or `fixed` discounts on existing subscriptions (Stripe applies at next invoice)
- **"On Checkout"** (blue badge) — for discounts where the church has no active subscription yet (coupon applied when they subscribe)

**2. Determine the indicator logic** by cross-referencing the discount's `tenant_id` against the `tenant_subscriptions` table:
- If `discount_type === "free"` → always "Immediate"
- If tenant has an active subscription → "Next Renewal"
- If tenant has no active subscription → "On Checkout"

**3. Add a helper tooltip/info** in the Add Discount dialog explaining when each type takes effect.

### Technical details

- **File**: `src/pages/SubscriptionOverrides.tsx`
- Join `subscriptions` data (already fetched) with `discounts` to determine if the tenant has an active sub
- Add a new `TableHead` "Effect" column and render the appropriate colored `Badge`
- Add translations for the new labels in all 3 languages (en, fr, ht)
- Add a small info note below the discount type selector in the dialog explaining timing

