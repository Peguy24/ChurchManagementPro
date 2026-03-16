

# Plan: Implement Full Feature Gating Aligned with Commercial Page

## Summary
Expand the feature flags in `usePlanLimits.tsx` and add `FeatureLockedCard` gating to ~20 ungated pages. The feature matrix will match what's advertised on the commercial page.

## 1. Update `src/hooks/usePlanLimits.tsx` — Expand feature flags

Add these new feature keys to the `features` object in every plan:

```text
Feature              | Trial/Free | Essentiel | Professionnel | Entreprise
---------------------|------------|-----------|---------------|----------
attendance           | ✅         | ✅        | ✅            | ✅
donations            | ✅         | ✅        | ✅            | ✅
advancedReports      | ❌         | ❌        | ✅            | ✅
emailNotifications   | ❌         | ❌        | ✅            | ✅
inventory            | ❌         | ❌        | ✅            | ✅
advancedFinance      | ❌         | ❌        | ✅            | ✅
smartInsights        | ❌         | ❌        | ✅            | ✅
bulkCommunication    | ❌         | ❌        | ✅            | ✅
automations          | ❌         | ❌        | ✅            | ✅
volunteerScheduling  | ❌         | ❌        | ✅            | ✅
memberCards          | ❌         | ❌        | ✅            | ✅
attendanceAlerts     | ❌         | ❌        | ✅            | ✅
churchHealth         | ❌         | ❌        | ✅            | ✅
customFields         | ❌         | ❌        | ✅            | ✅
dataBackup           | ❌         | ❌        | ✅            | ✅
churnPrevention      | ❌         | ❌        | ❌            | ✅
prioritySupport      | ❌         | ❌        | ❌            | ✅
whiteLabel           | ❌         | ❌        | ❌            | ✅
branding             | ❌         | ❌        | ❌            | ✅
```

Update the `PlanLimits["features"]` TypeScript interface to include all new keys.

## 2. Add `FeatureLockedCard` gating to ungated pages

Each page gets the same pattern already used (e.g., in `Inventory.tsx`):
```tsx
const { hasFeature, loading: planLoading } = usePlanLimits();
if (!planLoading && !hasFeature("featureKey")) {
  return <Layout><FeatureLockedCard ... requiredPlan="professionnel" /></Layout>;
}
```

Pages to gate:

| Page file | Feature key | Required plan |
|-----------|------------|---------------|
| `SmartInsights.tsx` | `smartInsights` | professionnel |
| `ChurnPrevention.tsx` | `churnPrevention` | entreprise |
| `ChurchHealthScores.tsx` | `churchHealth` | professionnel |
| `EngagementAutomations.tsx` | `automations` | professionnel |
| `VolunteerScheduling.tsx` | `volunteerScheduling` | professionnel |
| `BulkCommunication.tsx` | `bulkCommunication` | professionnel |
| `Budgets.tsx` | `advancedFinance` | professionnel |
| `BankReconciliation.tsx` | `advancedFinance` | professionnel |
| `SpecialFunds.tsx` | `advancedFinance` | professionnel |
| `CashRegister.tsx` | `advancedFinance` | professionnel |
| `FinancialAudit.tsx` | `advancedFinance` | professionnel |
| `CreditAndLoans.tsx` | `advancedFinance` | professionnel |
| `Salaries.tsx` | `advancedFinance` | professionnel |
| `FinancialDashboard.tsx` | `advancedFinance` | professionnel |
| `MemberCards.tsx` | `memberCards` | professionnel |
| `AttendanceAlerts.tsx` | `attendanceAlerts` | professionnel |
| `AttendanceArrivalReport.tsx` | `attendanceAlerts` | professionnel |
| `GroupComparisonDashboard.tsx` | `advancedReports` | professionnel |
| `DataBackup.tsx` | `dataBackup` | professionnel |
| `CustomFields.tsx` | `customFields` | professionnel |
| `TenantBranding.tsx` | `branding` | entreprise |

## 3. No database or backend changes needed

This is purely frontend feature gating using existing patterns. The `FeatureLockedCard` component and `usePlanLimits` hook already exist — we just expand them.

