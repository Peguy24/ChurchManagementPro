

## Plan: Handle Discount Expiry with Previous Plan Restoration

### Problem

When a 100% discount (free access) is granted, the system cancels the Stripe subscription. When that discount expires:
- If the church **never had a previous plan**: they should be forced to select a new plan (SubscriptionBlockPage)
- If the church **had a previous Stripe subscription** before the discount: the system should automatically re-subscribe them to that same plan instead of blocking them

Currently, nothing tracks the previous plan, so there's no way to restore it.

### Changes

#### 1. Database Migration
Add columns to `subscription_discounts` to remember the previous subscription state:

```sql
ALTER TABLE public.subscription_discounts 
  ADD COLUMN previous_stripe_subscription_id text DEFAULT NULL,
  ADD COLUMN previous_plan text DEFAULT NULL,
  ADD COLUMN previous_price_id text DEFAULT NULL;
```

#### 2. Update `apply-discount` Edge Function
When granting a "free" discount that cancels an active Stripe subscription:
- **Save** the subscription's product/price ID and plan name into the discount record before cancelling
- This preserves the info needed to restore the plan later

#### 3. Create `check-expired-discounts` Edge Function
A new scheduled function that:
1. Queries `subscription_discounts WHERE is_active = true AND valid_until < now()`
2. For each expired discount:
   - Sets `is_active = false`
   - If `previous_price_id` exists → creates a new Stripe checkout-less subscription using `stripe.subscriptions.create()` with the stored price ID and customer, effectively resuming billing
   - If no previous plan → sets `tenant_subscriptions.status = 'expired'` which triggers the existing SubscriptionBlockPage ("Select a plan")
   - Inserts a `tenant_notifications` record informing the church admin what happened
3. For percentage/fixed discounts: just deactivates the record and notifies (Stripe handles the coupon expiry automatically)

#### 4. Update `check-subscription` Edge Function
Add a safety net: if a tenant has a DB-only subscription (no Stripe customer) with `current_period_end` in the past, mark as expired. This catches free access grants that expired between cron runs.

#### 5. Translations
Add notification messages in EN/FR/HT for:
- "Your free access has ended. Your previous plan ({plan}) has been reactivated."
- "Your free access has ended. Please select a plan to continue."
- "Your discount has ended. Your next invoice will be at full price."

### Files

| File | Action |
|---|---|
| New migration | Add `previous_stripe_subscription_id`, `previous_plan`, `previous_price_id` columns |
| `supabase/functions/apply-discount/index.ts` | Save previous plan info before cancelling |
| `supabase/functions/check-expired-discounts/index.ts` | **New** — scheduled cleanup + auto-restore |
| `supabase/functions/check-subscription/index.ts` | Add period-end expiry check for DB-only subs |
| `src/pages/SubscriptionOverrides.tsx` | Show "Previous Plan" in table for free discounts |

### Flow

```text
Free discount expires
       │
       ▼
check-expired-discounts (cron)
       │
       ├─ Has previous_price_id?
       │     YES → stripe.subscriptions.create(customer, price)
       │           → Update tenant_subscriptions to active
       │           → Notify: "Plan X reactivated"
       │
       └─    NO  → Set tenant_subscriptions.status = 'expired'
                  → SubscriptionBlockPage shown
                  → Notify: "Select a plan"
```

