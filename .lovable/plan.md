

## Plan: Platform Business Management (Payroll, Employees, Tax Records)

### Overview
Expand the Super Admin area with dedicated modules for managing your business operations: employee records, payroll tracking, and tax preparation — all separate from church-level finances.

### New Database Tables

**1. `platform_employees`** — Store employee/contractor info
- id, full_name, email, phone, role/title, employment_type (full-time, part-time, contractor), hire_date, salary_amount, pay_frequency (monthly, bi-weekly, weekly), tax_id (SSN/EIN placeholder), status (active, inactive), bank_info (text/notes), notes, created_by, created_at, updated_at

**2. `platform_payroll`** — Track each pay run
- id, employee_id (FK to platform_employees), pay_period_start, pay_period_end, gross_amount, deductions (jsonb: federal_tax, state_tax, social_security, medicare, other), net_amount, payment_date, payment_method, reference_number, status (pending, paid, cancelled), notes, created_by, created_at

**3. `platform_tax_records`** — Track tax filings and obligations
- id, tax_type (federal_income, state_income, payroll_tax, sales_tax, other), tax_period (e.g. "2026-Q1"), amount_due, amount_paid, due_date, paid_date, status (pending, paid, overdue, filed), reference_number, filing_notes, document_url, created_by, created_at, updated_at

All three tables will have RLS policies restricted to super admins only.

### New Pages

**1. `/super-admin/payroll` — Platform Payroll** (new file: `src/pages/PlatformPayroll.tsx`)
- **Employees tab**: List all employees with add/edit/deactivate. Shows name, role, type, salary, status.
- **Pay Runs tab**: Record payroll payments per employee per period. Auto-calculates deductions (configurable percentages). Shows gross, deductions breakdown, net. Filter by month/employee.
- **Summary cards**: Total payroll this month, YTD payroll, active employees count, avg salary.
- **CSV export** for payroll records.

**2. `/super-admin/taxes` — Tax Management** (new file: `src/pages/PlatformTaxRecords.tsx`)
- Track quarterly/annual tax obligations (federal, state, payroll taxes).
- Status badges: pending (yellow), paid (green), overdue (red), filed (blue).
- Calendar view of upcoming due dates.
- Summary cards: Total taxes due, paid YTD, upcoming deadlines.
- **CSV export** for tax records.

### Navigation & Routing Updates

- **Layout.tsx**: Add two new nav items in super admin section:
  - `{ to: "/super-admin/payroll", icon: Users, label: "Payroll" }`
  - `{ to: "/super-admin/taxes", icon: FileText, label: "Taxes" }`
- **App.tsx**: Add two new protected super admin routes.
- **SuperAdminDashboard.tsx**: Add quick action buttons for both new pages.

### Translation Keys
Add FR/EN/HT labels for all new UI elements (employees, payroll, deductions, tax types, statuses, form fields).

### Files to Create/Modify
- **Create**: `src/pages/PlatformPayroll.tsx`, `src/pages/PlatformTaxRecords.tsx`
- **Modify**: `src/App.tsx` (routes), `src/components/Layout.tsx` (nav), `src/pages/SuperAdminDashboard.tsx` (quick actions), `src/contexts/LanguageContext.tsx` (translations)
- **Database**: 3 new tables with RLS policies via migration tool

