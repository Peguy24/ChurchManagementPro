

# Plan: Move Bank Reconciliation & Cash Register to Essentiel Plan

## Rationale
Essentiel users track donations but currently can't reconcile or trace cash flow. Bank reconciliation and cash register are basic accounting needs, not advanced features.

## Changes

### 1. `src/hooks/usePlanLimits.tsx`
- Add two new feature flags: `bankReconciliation` and `cashRegister`
- Set them to `true` in `BASIC_FEATURES` (which covers Free, Essentiel, and Trial)
- They remain `true` in PRO and ENTERPRISE via inheritance
- Update the `PlanLimits["features"]` interface

### 2. `src/App.tsx`
- Change the `<FeatureGate>` for `/finance/bank-reconciliation` from `feature="advancedFinance"` to `feature="bankReconciliation"` with `requiredPlan="essentiel"`
- Change the `<FeatureGate>` for `/finance/cash-register` from `feature="advancedFinance"` to `feature="cashRegister"` with `requiredPlan="essentiel"`

### 3. `src/components/FeatureLockedCard.tsx`
- Already has `bankReconciliation` and `cashRegister` translation keys — no changes needed

### What stays gated at Professionnel
Budgets, Salaries, Credit/Loans, Financial Audit, Special Funds, Financial Dashboard — all remain under `advancedFinance`.

