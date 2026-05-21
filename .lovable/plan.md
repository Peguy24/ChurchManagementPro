# Owner Contribution Tracking on Platform Expenses

Add the ability, on the Super Admin Platform Accounting page, to record **who funded** each expense — either business sources (checking, credit card, other) or **personal contributions split per owner** (percent-based).

## 1. Owners management (new)

New page **Settings → Business Owners** (Super Admin only) to manage a flexible list of co-owners.

- Table `platform_owners`: `id`, `name`, `email` (optional), `default_share_percent` (numeric, default 50), `is_active` (bool), `display_order`.
- Simple CRUD UI: add/edit/remove owners, set default ownership %.
- Validation: sum of active owners' default % should equal 100 (warning, not blocker).

## 2. Expense funding source

In the **Platform Expense dialog** (`PlatformAccounting.tsx`), add a new section **"Funding Source"** with a radio group:

- Business checking
- Business credit card
- Owners (personal funds)
- Other / custom (free-text label)

Persist on `platform_expenses`:
- `funding_source` text — one of `business_checking | business_credit_card | owners_personal | other`
- `funding_source_label` text — free text when `other`

## 3. Owner split (when "Owners personal funds" selected)

When the source is **Owners personal**, show a dynamic table of all active owners with:
- Owner name (read-only)
- Percent input (defaults to each owner's `default_share_percent`)
- Auto-computed amount = `expense.amount × percent / 100`
- Live total row — must equal 100% / full amount before save (blocks submit otherwise)

Persist in new table `platform_expense_contributions`:
- `id`, `expense_id` (FK → platform_expenses, cascade delete)
- `owner_id` (FK → platform_owners)
- `percent` numeric, `amount` numeric
- `tenant_id` not needed (platform-level)

## 4. Display & reporting

- **Expense list:** add a "Funding" column showing a badge (Checking / Card / Owners / label) and, if owners-funded, a small tooltip "Owner A 50% • Owner B 50%".
- **New summary widget** on PlatformAccounting: "Owner Contributions YTD" — total each owner has put in from personal funds (for settle-up).
- CSV export includes funding source + per-owner amounts.

## 5. Out of scope

- Tenant (church) expenses are unchanged.
- No reimbursement workflow yet — purely tracking; settle-up is manual based on the summary.

## Technical Details

**Migration:**
```sql
create table public.platform_owners (...);  -- RLS: super admin only
alter table public.platform_expenses
  add column funding_source text not null default 'business_checking',
  add column funding_source_label text;
create table public.platform_expense_contributions (...);  -- RLS: super admin only
```

**Files to touch:**
- `supabase/migrations/...` — new tables + columns + RLS
- `src/pages/PlatformAccounting.tsx` — expense dialog + list column + summary widget
- `src/pages/PlatformSettings.tsx` (or new `BusinessOwners.tsx` route) — owners CRUD
- `src/contexts/LanguageContext.tsx` — EN/FR/HT strings
- `src/App.tsx` — route for owners page if separate
- `src/components/Layout.tsx` — sidebar link under Super Admin section
