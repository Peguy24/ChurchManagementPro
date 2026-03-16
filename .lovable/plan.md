

## Fix: Missing `sub.managedByAdmin` Translation Key

The `SubscriptionCard.tsx` component references `t("sub.managedByAdmin")` but this key was never added to the translations in `LanguageContext.tsx`. The `t()` function returns the raw key when it can't find a match, and the `||` fallback doesn't work because the returned string `"sub.managedByAdmin"` is truthy.

### Changes

**1. Add `managedByAdmin` key to all 3 language blocks in `src/contexts/LanguageContext.tsx`:**
- **FR** (after `manageSub` ~line 2890): `managedByAdmin: "Cet abonnement est géré par l'administrateur de la plateforme."`
- **EN** (after `manageSub` ~line 6137): `managedByAdmin: "This subscription is managed by the platform administrator."`
- **HT** (after `manageSub` ~line 9383): `managedByAdmin: "Abònman sa a jere pa administratè platfòm nan."`

No other file changes needed — the `SubscriptionCard.tsx` code already uses this key correctly.

