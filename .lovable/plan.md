

## Problem

Plan limits for members are only enforced on the "Add Member" button in `Members.tsx`. The **bulk import** (`MemberImportDialog.tsx`) has zero plan limit checks — it imports all valid rows even if the tenant is over their limit. Additionally, when a plan reaches its maximum, there's no clear feedback during import about *why* rows were rejected.

## Plan

### 1. Enforce plan limits in MemberImportDialog

**File: `src/components/MemberImportDialog.tsx`**

- Import `usePlanLimits` hook
- Before starting import, calculate `remainingCapacity = limits.maxMembers - usage.membersCount`
- If `remainingCapacity <= 0`: show limit dialog, block import entirely
- If `remainingCapacity < validRows.length`: show a warning that only the first N rows will be imported, truncate the import batch
- During import loop, track running count and stop inserting once capacity is reached — remaining rows marked as "limit reached" failures
- Add plan limit info to the preview step (e.g., "Your plan allows 200 members, you currently have 185. You can import up to 15 more.")

### 2. Add limit check to the import button on Members page

**File: `src/pages/Members.tsx`**

- The "Import" button currently opens the dialog without checking limits
- Add a `canAddMember()` check before opening import dialog; if at limit, show `PlanLimitDialog` instead

### 3. Improve feedback when limit is reached

**File: `src/components/MemberImportDialog.tsx`**

- In the import results, distinguish "limit reached" rows from other failures
- Show a clear message: "X members imported. Y skipped (plan limit reached). Upgrade to import more."
- Include a link/button to the subscription page when limit is the blocker

### Summary of changes

```text
Members.tsx
  └─ Import button → check canAddMember() before opening dialog

MemberImportDialog.tsx
  └─ usePlanLimits() → get remaining capacity
  └─ Preview step → show "X of Y will be imported (plan limit)"
  └─ Import loop → stop at capacity, mark excess as "limit reached"
  └─ Results → separate "limit reached" from other errors
```

