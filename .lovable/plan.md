# Top 3 Super Admin additions

## 1. Tenant Impersonation
Let a Super Admin browse the app "as" a specific tenant to reproduce issues without asking for credentials.

- New table `impersonation_sessions` (super_admin_id, tenant_id, started_at, ended_at, reason) with RLS restricted to Super Admins for full audit trail.
- New page `/super-admin/impersonation` with a tenant picker + "Reason" field. Starting a session:
  - Records a row in `impersonation_sessions`
  - Writes a `platform_activity_logs` entry (`admin_action` / `impersonation_started`)
  - Stores an `impersonation` object in `sessionStorage` with `tenant_id`, `session_id`, `super_admin_id`
- Update `useCurrentTenant` to prefer the impersonated `tenant_id` when the flag is present (only if the user is a Super Admin — guarded server-side by existing RLS).
- Persistent top banner (red) on every page when impersonating: "Viewing as {ChurchName} — Exit impersonation". Ending the session clears sessionStorage, logs `impersonation_ended`, and updates `ended_at`.
- Read-only by default: block destructive writes by short-circuiting sensitive mutations in the client while impersonating (soft guard — Super Admin still has DB rights, but the UI prevents accidental changes).

## 2. Email Delivery Dashboard
Follows the platform's built-in `email_send_log` guide: dedupe by `message_id`, six required features.

- New page `/super-admin/emails` (Super Admin only).
- Filters: time range (24h / 7d / 30d / custom), template (`template_name` distinct list), status (All / Sent / Failed (dlq) / Suppressed).
- Summary cards: total unique emails, sent, failed, suppressed — deduped on `message_id`.
- Table (paginated, 50/page): Template, Recipient, Status badge, Timestamp, Error message on failures. Sorted by newest first.
- Uses `supabase.from('email_send_log')` with a client-side dedupe (latest row per `message_id`).
- Sidebar link under Super Admin → Communications: "Email delivery".

## 3. Super Admin Audit Log Viewer
A dedicated viewer over `platform_activity_logs` + `financial_audit_logs` for accountability across multiple admins.

- New page `/super-admin/audit-log`.
- Two tabs:
  - **Platform activity**: filter by category (auth/subscription/tenant/user/support/general), event type, actor email, tenant, date range. Table with expandable row showing `metadata` JSON.
  - **Financial audit**: filter by entity type, action (create/update/delete), actor, tenant, date range. Expandable row shows `old_values` vs `new_values` diff.
- Both tabs include CSV export (respects current filters, localized headers, excludes internal IDs per the export standard).
- Sidebar link under Super Admin → Security: "Audit log".

## Technical details
- Migration: create `impersonation_sessions` table with `GRANT`s + RLS (Super Admin only), plus indexes on `platform_activity_logs(created_at, event_category)` and `email_send_log(created_at, message_id)` if not already present.
- New components: `ImpersonationBanner.tsx`, `EmailDeliveryTable.tsx`, `AuditLogFilters.tsx`.
- New hook: `useImpersonation()` — reads `sessionStorage`, exposes `{ isImpersonating, tenantId, exit() }`.
- Route registration + sidebar entries in `Layout.tsx` (Super Admin section).
- All strings added to `LanguageContext.tsx` in EN / FR / HT.
- No changes to auth, billing, or tenant data models.
