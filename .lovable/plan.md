

## Plan: Data Management — Archive System with Report Integration

### Overview

Build a **Data Management** page where church admins can archive old records (attendance, donations, expenses) by date range. Archived data moves to dedicated archive tables, freeing query performance while remaining accessible as read-only summaries in member reports.

### Phase 1: Database Migration

**Create 3 archive tables** mirroring the structure of active tables:
- `attendance_records_archive` — same columns as `attendance_records`
- `donations_archive` — same columns as `donations`
- `expenses_archive` — same columns as `expenses`

Each archive table includes an extra `archived_at` timestamp and `archived_by` (user_id).

**Create `data_cleanup_logs` table** for audit trail:
- `id`, `tenant_id`, `data_type`, `records_archived`, `date_before`, `archived_by`, `created_at`

**RLS policies**: tenant-scoped access for admins on all archive tables (read-only) and cleanup logs.

**Helper functions**:
- `archive_tenant_attendance(tenant_id, before_date)` — moves rows from active → archive
- `archive_tenant_donations(tenant_id, before_date)` — same for donations
- `archive_tenant_expenses(tenant_id, before_date)` — same for expenses
- `get_member_archived_stats(member_id)` — returns aggregated counts/totals from archive tables

All functions are `SECURITY DEFINER` with `is_tenant_admin()` checks.

### Phase 2: Edge Function — `bulk-data-archive`

Server-side function that:
1. Validates caller is tenant admin (JWT + `is_tenant_admin()`)
2. Accepts `{ tenant_id, data_type, before_date, dry_run }`
3. In dry-run mode: returns count of records that would be archived
4. In execute mode: calls the appropriate archive function, logs to `data_cleanup_logs`, returns count
5. Supports data types: `attendance`, `donations`, `expenses`

### Phase 3: Data Management Page — `src/pages/DataManagement.tsx`

UI with cards per data type:

```text
┌─────────────────────────────────────────┐
│  📦 Data Management                     │
├─────────────────────────────────────────┤
│                                         │
│  [Attendance Records]                   │
│  Archive records older than: [Date]     │
│  Preview: 1,234 records will be moved   │
│  [Export First]  [Archive]              │
│                                         │
│  [Donations / Income]                   │
│  Archive records older than: [Date]     │
│  ⚠ Financial data — export required     │
│  Preview: 567 records will be moved     │
│  [Export First]  [Archive]              │
│                                         │
│  [Expenses]                             │
│  Archive records older than: [Date]     │
│  ⚠ Financial data — export required     │
│  Preview: 234 records will be moved     │
│  [Export First]  [Archive]              │
│                                         │
│  ── Archive History ──                  │
│  Table showing past archive operations  │
└─────────────────────────────────────────┘
```

**Safety features**:
- Date picker for cutoff (default: 1 year ago)
- "Preview" button calls dry-run to show record count
- Financial data (donations/expenses) forces export before archive
- Double confirmation dialog with record count
- Archive history log at the bottom

### Phase 4: Report Integration

Update **3 existing components** to show archived data summaries:

**`MemberAttendanceStats.tsx`**:
- Query `attendance_records_archive` for the member
- Show: "📦 + X archived attendance records (Jan 2022 – Dec 2024)" as a collapsed info banner

**`MemberDonationStats.tsx`**:
- Query `donations_archive` for the member
- Show: "📦 + X archived donations, total: $Y" as collapsed info banner
- "All-time total" stat includes archived amounts

**`MemberTimeline.tsx`**:
- Add a collapsed "Archived History" section at the bottom
- Shows aggregated counts: "156 attendance records, 45 donations archived"
- "View archived details" button expands to show archived records (read-only, paginated)

### Phase 5: Routing & Navigation

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/settings/data-management` route, gated by admin + FeatureGate `dataBackup` |
| `src/components/Layout.tsx` | Add "Data Management" nav item under Settings group |
| `src/lib/permissions.ts` | Add `/settings/data-management` → `"settings"` in ROUTE_TO_GROUP |
| `src/contexts/LanguageContext.tsx` | Add translations for fr/en/ht |

### Files Summary

| File | Action |
|------|--------|
| Migration: archive tables + functions | Create |
| `supabase/functions/bulk-data-archive/index.ts` | Create |
| `src/pages/DataManagement.tsx` | Create |
| `src/components/MemberAttendanceStats.tsx` | Edit — add archived summary |
| `src/components/MemberDonationStats.tsx` | Edit — add archived summary |
| `src/components/MemberTimeline.tsx` | Edit — add archived section |
| `src/App.tsx` | Edit — add route |
| `src/components/Layout.tsx` | Edit — add nav item |
| `src/lib/permissions.ts` | Edit — add route mapping |
| `src/contexts/LanguageContext.tsx` | Edit — add translations |

