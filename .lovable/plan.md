## Problem

When a Super Admin activates a plan from **Tenant Management → Activate Plan**, the chosen value (e.g. `"enterprise"`) is written verbatim into `tenant_subscriptions.plan`. But the rest of the system expects different keys:

- Edge function `check-subscription` maps `basic → essentiel`, `standard → professionnel`, `premium → entreprise`. It does **not** know `"enterprise"`.
- Frontend `usePlanLimits` knows `essentiel / professionnel / entreprise` (French). It does **not** know `"enterprise"` (English).

So the activated plan exists in the DB with `status='active'`, `managed_by_admin=true`, but every consumer treats it as unknown → falls back to the `"none"` plan → dashboard shows no active subscription, feature gates lock everything.

Confirmed against the live row for tenant `b921daeb-72bb-4774-88f9-ff79aff6bd9b` (`plan='enterprise'`, `status='active'`).

## Fix

Normalize plan keys end-to-end on the canonical DB set: **`free`, `basic`, `standard`, `premium`**.

### 1. `src/pages/TenantManagement.tsx`
- Change `SubscriptionPlan` to `"free" | "basic" | "standard" | "premium"` (drop `"enterprise"`).
- Update `PLAN_CONFIG` accordingly so the Activate-Plan dropdown only offers the 4 canonical keys (label can still read "Enterprise" for `premium`).
- This keeps writes aligned with what `check-subscription` and the frontend already expect.

### 2. `supabase/functions/check-subscription/index.ts`
- Add defensive normalization in `DB_TO_PLAN`: also map `"enterprise" → "entreprise"` (and lowercased variants) so any legacy rows still resolve.

### 3. `src/hooks/usePlanLimits.tsx`
- In `DB_TO_FRONTEND_PLAN`, add `enterprise: "entreprise"` as a safety alias so any stray English value still resolves to the correct tier.

### 4. Data backfill (migration)
Update the existing broken row so the user sees the plan immediately:
```sql
UPDATE public.tenant_subscriptions
SET plan = 'premium'
WHERE plan = 'enterprise';
```

### 5. Verification
- Reload the affected tenant dashboard → plan badge shows "Enterprise / Entreprise" and `status='active'`.
- `FeatureGate` should unlock all entreprise-tier features.
- Activate a different plan from Tenant Management → verify it shows as active without further changes.

## Out of scope
- Renaming the French `entreprise` key to English across the frontend (larger refactor).
- Stripe-managed subscriptions (already working — this only touched the admin-managed path).
