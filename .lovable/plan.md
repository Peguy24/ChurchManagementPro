

# Plan: Add Annual Billing with 15% Discount

## Pricing
| Plan | Monthly | Annual (15% off) | Savings |
|------|---------|-------------------|---------|
| Essential | $49/mo | $499/yr (~$41.58/mo) | $89/yr |
| Professional | $99/mo | $1,009/yr (~$84.08/mo) | $179/yr |
| Enterprise | $199/mo | $2,030/yr (~$169.17/mo) | $358/yr |

## Step 1: Create 3 Annual Prices in Stripe
Use Stripe tools to create yearly recurring prices on the existing products:
- `prod_Tqetfpt7pnhNFf` → $499/year
- `prod_TqetHNAL0zc5kD` → $1,009/year
- `prod_TqeuZk0jVNwjEp` → $2,030/year

## Step 2: Update `useSubscription.tsx`
- Add `yearlyPriceId` and `yearlyPrice` to each entry in `PLAN_DETAILS`
- Update `createCheckout` to accept a `billingInterval: "monthly" | "yearly"` parameter and pass it to the edge function

## Step 3: Update `create-checkout` Edge Function
- Accept `interval` param alongside `plan`
- Add `YEARLY_PRICE_IDS` map with the new Stripe price IDs
- Select the correct price ID based on interval
- Update `PLAN_TO_DB` for free-access yearly scenarios

## Step 4: Update `SubscriptionCard.tsx`
- Add a Monthly/Yearly toggle (switch or tabs) above the plan list
- Show both prices: monthly price struck-through when yearly is selected, with a "Save 15%" badge
- Pass the selected interval to `createCheckout`

## Step 5: Update `Commercial.tsx` Pricing Section
- Add the same Monthly/Yearly toggle to the marketing page pricing cards
- Show annual prices and savings when yearly is selected
- Pass interval through to `handlePlanSelect` → `create-checkout`

## Step 6: Add Translations
Add keys for: `sub.monthly`, `sub.yearly`, `sub.save15`, `sub.perYear`, `sub.billedAnnually` in EN/FR/HT

## Files Modified
- `src/hooks/useSubscription.tsx` — plan details + checkout param
- `src/components/SubscriptionCard.tsx` — billing toggle UI
- `src/pages/Commercial.tsx` — marketing pricing toggle
- `supabase/functions/create-checkout/index.ts` — yearly price routing
- Language context (translations)

