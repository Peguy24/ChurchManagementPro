

## Problem Diagnosis

The expenses query returns **empty results** because all existing expenses in the database have `tenant_id = NULL`, while your account belongs to a specific tenant (`637bff83-...`). The security policy filters expenses by tenant, so NULL-tenant expenses are invisible to you.

This is the same `tenant_id` issue that affected other modules. Two things need to happen:

---

## Plan

### 1. Database Migration: Update existing expenses with your tenant_id
- Update all existing expenses that have `tenant_id = NULL` to assign them to your tenant
- This will make the historical data visible again

### 2. Same fix for related tables missing tenant_id
Several financial tables still use the old global `has_role()` policies instead of tenant-aware `has_tenant_role()` policies, which means they won't work for tenant users:

**Tables with old-style RLS (no tenant awareness):**
- `cash_transactions` — uses `has_role()` instead of `has_tenant_role()`
- `fund_transactions` — uses `has_role()` instead of `has_tenant_role()`
- `budgets` — uses `has_role()` instead of `has_tenant_role()`
- `salary_payments` — uses `has_role()` instead of `has_tenant_role()`
- `expense_categories` — uses `has_role()` instead of `has_tenant_role()`
- `income_categories` — uses `has_role()` instead of `has_tenant_role()`
- `inventory_maintenance` — uses `has_role()` instead of `has_tenant_role()`

These tables need `tenant_id` columns added (where missing) and their RLS policies updated to use `has_tenant_role()` so they work properly for tenant users.

### 3. Backfill tenant_id on other financial tables
Tables that already have `tenant_id` columns but have NULL values in existing rows:
- `expenses` — backfill existing NULL rows
- `donations` — backfill existing NULL rows
- `bank_accounts` — backfill existing NULL rows
- `employees` — backfill existing NULL rows

### Technical Details

**Migration SQL will:**
1. Add `tenant_id` column to tables that don't have it (`cash_transactions`, `fund_transactions`, `budgets`, `salary_payments`, `expense_categories`, `income_categories`, `inventory_maintenance`)
2. Backfill all NULL `tenant_id` values across all financial tables to the user's tenant
3. Drop old `has_role()`-based RLS policies and create new `has_tenant_role()`-based policies for each affected table
4. Add foreign key references to the `tenants` table

**No frontend code changes needed** — the Expenses page already includes `tenant_id` in inserts and the approve/reject buttons already exist in the code. The issue is purely that data is invisible due to RLS filtering.

