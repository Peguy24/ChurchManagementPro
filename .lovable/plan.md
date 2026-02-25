

## Analysis: Salary Payments Are NOT Synchronized with Expenses

Currently, when a salary payment is recorded in `Salaries.tsx` (line 191-215), the system only:
1. Inserts a row into `salary_payments`
2. Shows a success toast

It does **not**:
- Create a corresponding record in the `expenses` table
- Deduct the amount from the linked `bank_account` or `cash_register`
- Record a `cash_transaction` or `bank_transaction`
- Appear in the Financial Dashboard totals

This means salary costs are invisible to the expense tracking, budget monitoring, and financial dashboard.

---

## Plan: Synchronize Salary Payments with the Financial Ecosystem

### 1. Database: Create an "expense_category" for salaries (if not exists)
- Ensure an expense category named "Salaires" exists for the tenant so salary-related expenses are properly categorized.

### 2. Update `paymentMutation` in `src/pages/Salaries.tsx`
When a salary payment is created, the mutation will also:

- **Insert an expense** in the `expenses` table with:
  - `category_id` → "Salaires" category
  - `amount` → salary amount
  - `status` → `approved` (salaries are pre-approved)
  - `payment_method` → from the salary payment form
  - `bank_account_id` / `cash_register_id` → from the salary payment form
  - `description` → "Salaire - [Employee Name] - [Period]"
  - `tenant_id` → current tenant

- **Deduct from the payment source**:
  - If `cash_register_id` → update `cash_registers.current_balance` (subtract amount) and insert a `cash_transactions` record
  - If `bank_account_id` → update `bank_accounts.current_balance` (subtract amount)

### 3. Files to modify
- **`src/pages/Salaries.tsx`**: Update `paymentMutation` to chain expense creation + balance deduction after salary_payments insert

### 4. Impact
After this change:
- Salary payments will appear in the Expenses list
- Salary costs will be reflected in the Financial Dashboard
- Budget tracking will account for salary spending
- Bank/cash register balances will be automatically updated
- Full audit trail via financial_audit_logs triggers (already in place)

### Technical Details
- The mutation will use a sequential flow: insert salary_payment → insert expense → update balance → insert cash_transaction (if cash)
- All operations use the same `tenant_id` for RLS compliance
- No database migration needed — all tables and columns already exist
- The "Salaires" expense category will be fetched or auto-created at component mount

