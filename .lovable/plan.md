

# Deep Tenant Data Isolation Audit

## Summary of Findings

After analyzing all 61 tables, 210 RLS policies, and frontend queries, I found **9 critical isolation issues** where tenant data could leak between churches.

---

## CRITICAL Issues (Data Leaks Between Tenants)

### 1. `ministry_members` table — SELECT policy allows cross-tenant reads
**Severity: HIGH**
The policy `'Authenticated users can view ministry members'` uses `USING condition: true`. Any authenticated user from ANY tenant can read all ministry membership data from ALL tenants. This table has no `tenant_id` column, so isolation must be enforced by joining to the `ministries` table.

**Fix:** Replace with a policy that joins to `ministries` and checks `tenant_id`:
```sql
DROP POLICY "Authenticated users can view ministry members" ON ministry_members;
CREATE POLICY "Tenant users can view ministry members" ON ministry_members
FOR SELECT USING (
  EXISTS (SELECT 1 FROM ministries m WHERE m.id = ministry_members.ministry_id AND (m.tenant_id = get_user_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)))
);
```
Same fix needed for INSERT, UPDATE, DELETE policies on `ministry_members` which also lack tenant scoping.

### 2. `member_documents` table — No tenant isolation at all
**Severity: HIGH**
All 4 RLS policies (`Staff can view/insert/update`, `Admins can delete`) use only global `has_role()` checks (e.g., `has_role(auth.uid(), 'admin')`) with **no tenant filtering**. A pastor from Church A could see documents from Church B.

**Fix:** Add tenant-scoped policies that join through the `members` table to verify tenant ownership.

### 3. `inventory_usage` table — No tenant isolation
**Severity: HIGH**
All 4 policies use only global `has_role()` checks with no tenant filtering. Any user with a global `secretary` or `volunteer` role could see/modify inventory usage records across all tenants.

**Fix:** Add tenant-scoped policies that join through `inventory_items` to verify tenant ownership.

### 4. `email_templates` table — No tenant isolation
**Severity: MEDIUM**
This table has no `tenant_id` column. All templates are shared across tenants. If templates are meant to be per-church, a `tenant_id` column and tenant-scoped policies are needed.

### 5. `events` table — Anon policy exposes all tenants' events
**Severity: MEDIUM**
The `'Anyone can view events for registration'` policy uses `USING: true` for the `anon` role. All events from all churches are readable without authentication. The scan confirmed this — sample data shows events from tenant `637bff83` visible anonymously.

**Fix:** Restrict anon SELECT to require a specific tenant context (e.g., only when querying by tenant_id).

### 6. `admin_invitations` — Tokens and emails exposed publicly
**Severity: CRITICAL (Security)**
The `'Anyone can validate invitation tokens'` policy uses `USING: true`, exposing ALL invitation tokens and email addresses. An attacker could enumerate tokens and gain admin access.

**Fix:** Replace with a server-side function that validates a supplied token, or restrict the SELECT policy to only match by token.

### 7. `super_admin_invitations` — Active tokens exposed publicly
**Severity: CRITICAL (Security)**
The `'Public can validate active tokens'` policy returns all unused, non-expired super admin invitation tokens. An attacker could steal a token and register as a super admin.

**Fix:** Same approach — use a server-side function for token validation.

### 8. `profiles` table — All profiles readable by any authenticated user
**Severity: LOW**
`'Users can view all profiles'` uses `USING: true`. Any authenticated user sees all profiles (names, avatar_url, tenant_id). Low severity since profiles contain limited PII, but it does leak which users belong to which tenant.

### 9. Frontend queries missing tenant_id filter
**Severity: MEDIUM** (partially mitigated by RLS)
Several pages query without `.eq("tenant_id", tenantId)`:
- `src/pages/Events.tsx` — queries events without tenant filter (RLS partially protects authenticated users but not the anon leak)
- `src/pages/MinistriesStats.tsx` — queries `ministry_members` without any filter (combined with the open RLS policy, this leaks data)
- `src/components/reports/MembersReportTab.tsx` — queries `ministry_members` without filter

While RLS is the primary defense, adding frontend tenant_id filters is defense-in-depth and improves query performance.

---

## Tables That ARE Properly Isolated (Confirmed Good)

The following tenant-scoped tables correctly use `tenant_id = get_user_tenant_id(auth.uid())` in their RLS policies:
members, donations, expenses, attendance_records, branches, ministries, church_settings, inventory_items, inventory_maintenance, budgets, bank_accounts, cash_registers, cash_transactions, fund_transactions, special_funds, salary_payments, employees, expense_categories, income_categories, pastoral_alerts, visitors, visitor_follow_ups, volunteer_schedules, service_roles, member_requests, event_registrations, custom_fields, custom_field_values, support_tickets, tenant_notifications, role_permissions, tenant_onboarding_progress, member_engagement_scores, member_risk_predictions, financial_audit_logs, tenant_user_roles.

---

## Implementation Plan

### Migration 1: Fix `ministry_members` RLS (highest priority)
- Drop all 4 existing policies
- Create 4 new policies that join to `ministries` table to check `tenant_id`

### Migration 2: Fix `member_documents` RLS
- Drop all 4 existing policies
- Create 4 new policies that join to `members` table to check `tenant_id`

### Migration 3: Fix `inventory_usage` RLS
- Drop all 4 existing policies
- Create 4 new policies that join to `inventory_items` table to check `tenant_id`

### Migration 4: Fix `admin_invitations` and `super_admin_invitations` SELECT policies
- Replace open SELECT with token-specific validation (only return rows matching a supplied token)

### Migration 5: Fix `events` anon policy
- Restrict anon SELECT to require a tenant_id filter in the query

### Frontend fixes:
- Add `.eq("tenant_id", tenantId)` to queries in `Events.tsx`, `MinistriesStats.tsx`, `MembersReportTab.tsx`

---

## Summary Table

| Table | Issue | Severity |
|-------|-------|----------|
| `ministry_members` | SELECT open to all authenticated | HIGH |
| `member_documents` | No tenant check in any policy | HIGH |
| `inventory_usage` | No tenant check in any policy | HIGH |
| `admin_invitations` | Tokens publicly readable | CRITICAL |
| `super_admin_invitations` | Tokens publicly readable | CRITICAL |
| `events` | Anon can read all tenants' events | MEDIUM |
| `email_templates` | No tenant_id column | MEDIUM |
| `profiles` | All profiles visible to all users | LOW |
| Frontend queries | Missing tenant_id filters | MEDIUM |

