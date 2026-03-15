

# Plan: Apply Interest Rate to Credit Operations

## Current Problem
The `interest_rate` field exists in the form and database but is purely informational. The system does not compute the total owed amount including interest — it only compares payments against `total_amount`. So if a church borrows 10,000 at 5% interest, the system treats the debt as 10,000 instead of 10,500.

## What Changes

### 1. Compute Total with Interest
In `CreditAndLoans.tsx`, calculate the **effective total** as:

```
effectiveTotal = total_amount + (total_amount × interest_rate / 100)
```

This applies everywhere the total is displayed or compared:
- Summary cards (Total Debts, Total Credits)
- Progress bars (remaining balance)
- The trigger that marks operations as `completed`

### 2. Update the Database Trigger
Modify `update_credit_operation_on_payment()` to compare payments against `total_amount + (total_amount * interest_rate / 100)` instead of just `total_amount`. This ensures the operation only becomes `completed` when the full amount **including interest** is paid.

### 3. Display Interest Details
In the operations table, show:
- Original amount
- Interest rate (%)
- Total with interest (computed)
- Amount paid / Remaining

### 4. Translations
Add keys for "Total with interest" / "Total avec intérêts" / "Total ak enterè" in all 3 languages.

## Files Modified

| File | Change |
|------|--------|
| Migration SQL | Update trigger to include interest in completion check |
| `src/pages/CreditAndLoans.tsx` | Compute effective total in UI, show interest details |
| `src/contexts/LanguageContext.tsx` | Add ~3 translation keys |

