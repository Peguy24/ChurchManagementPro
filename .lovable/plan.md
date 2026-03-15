

# Plan: Link Credit Payments to Cash Registers & Bank Accounts

## Current Problem
Credit payments are recorded in isolation — no deduction from the church's cash register or bank account. Other financial modules (Expenses, Salaries, Donations) already integrate with `cash_registers` and `bank_accounts`.

## What Changes

### 1. Payment Form — Add Payment Source Selection
In the payment dialog of `CreditAndLoans.tsx`:
- Add a **"Payment Source"** selector: Cash Register or Bank Account
- When "Cash Register" is chosen, show a dropdown of active cash registers
- When "Bank Account" is chosen, show a dropdown of bank accounts
- **Validate**: Check sufficient balance before allowing the payment (same pattern as Expenses/Salaries)

### 2. Payment Mutation — Deduct from Source
When recording a payment:
- If paying from **cash register**: deduct amount from `cash_registers.current_balance` and insert a `cash_transactions` record (type: `expense`, description referencing the credit operation)
- If paying from **bank account**: deduct from `bank_accounts.current_balance` (if tracked)
- Apply the same `INSUFFICIENT_BALANCE` check used in CashRegister/Expenses/Salaries pages

### 3. For Loans Given — Record Incoming Payments
When receiving a repayment on a loan the church gave:
- **Add** the amount to the selected cash register or bank account (it's money coming in)

### 4. Translations (3 languages)
Add new keys to `LanguageContext.tsx`:
- `paymentSource`, `selectCashRegister`, `selectBankAccount`, `cashRegister`, `bankAccount`, `insufficientBalance` (reuse existing key)

### Files Modified
| File | Change |
|------|--------|
| `src/pages/CreditAndLoans.tsx` | Add source selector in payment form, fetch cash registers & bank accounts, deduct/add balance on payment |
| `src/contexts/LanguageContext.tsx` | Add ~6 new translation keys in creditAndLoans section |

### Logic Summary

```text
Payment on credit_purchase or loan_received (church owes money):
  → DEDUCT from selected cash register/bank account

Payment on loan_given (church is owed money):
  → ADD to selected cash register/bank account
```

No database schema changes needed — uses existing `cash_registers`, `bank_accounts`, and `cash_transactions` tables.

