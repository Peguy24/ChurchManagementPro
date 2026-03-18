

## Current Situation

Right now, the discount system has **no plan selector** — a discount applies to the tenant globally, regardless of which plan they choose. So if you give a church 100% discount:

- **"Free Access" type**: Activates immediately but doesn't let you pick which plan (defaults to whatever they had or need manual DB setup).
- **"Percentage 100%"**: Applied on checkout, but the church could pick *any* plan and get it free.

You need a **target plan** field so the discount only applies when the church subscribes to the specific plan you intended.

## Plan: Add Target Plan Selector to Discounts

### 1. Database Migration
Add a `target_plan` column to `subscription_discounts`:
```sql
ALTER TABLE public.subscription_discounts 
ADD COLUMN target_plan text DEFAULT NULL;
```
- `NULL` = applies to any plan (backward compatible)
- Values: `essentiel`, `professionnel`, `entreprise`

### 2. Update Discount Form (SubscriptionOverrides.tsx)
- Add a **"Target Plan"** dropdown after the church selector with options: "Any Plan", "Essentiel", "Professionnel", "Entreprise"
- Save the selected plan to the new `target_plan` column
- Display the target plan in the Active Discounts table

### 3. Update `create-checkout` Edge Function
- When looking up active discounts, if `target_plan` is set, only apply the discount if the selected checkout plan matches
- For "free" type with a target plan, activate that specific plan tier in the DB

### 4. Update `apply-discount` Edge Function
- Pass through the `target_plan` info so Stripe coupon application respects the plan restriction

### 5. Translations
- Add trilingual labels (EN/FR/HT) for "Target Plan", "Any Plan", and plan names

### Files to modify
- `src/pages/SubscriptionOverrides.tsx` — form + table column
- `supabase/functions/create-checkout/index.ts` — filter discount by plan
- `supabase/functions/apply-discount/index.ts` — pass target plan context
- New DB migration for `target_plan` column

