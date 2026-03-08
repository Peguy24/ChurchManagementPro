

## Platform Activity Log for Super Admins

### Overview
Create a new `platform_activity_logs` table and a dedicated dashboard page at `/super-admin/activity` that aggregates all significant platform events into a filterable, searchable timeline.

### 1. Database: Create `platform_activity_logs` table

New migration to create the table:

```sql
CREATE TABLE public.platform_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,          -- 'signup', 'subscription_change', 'admin_action', 'tenant_created', 'tenant_deleted', 'user_approved', 'trial_extended', 'plan_changed', 'login', 'support_ticket'
  event_category text NOT NULL DEFAULT 'general',  -- 'auth', 'subscription', 'tenant', 'user', 'support'
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,  -- flexible payload (old/new values, details)
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_email text,
  ip_address text
);

ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view activity logs"
  ON public.platform_activity_logs FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert activity logs"
  ON public.platform_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "System can insert activity logs"
  ON public.platform_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_platform_activity_logs_created_at ON public.platform_activity_logs(created_at DESC);
CREATE INDEX idx_platform_activity_logs_event_category ON public.platform_activity_logs(event_category);
CREATE INDEX idx_platform_activity_logs_tenant_id ON public.platform_activity_logs(tenant_id);
```

### 2. New Page: `src/pages/PlatformActivityLog.tsx`

A dedicated Super Admin page with:
- **Timeline view**: Chronological list of events with icons per category
- **Filters**: Event category (auth, subscription, tenant, user, support), date range, tenant search
- **Pagination**: Load more / infinite scroll (initial 50, load 50 more)
- **Event cards**: Show event type icon, description, tenant name, user email, timestamp, expandable metadata
- **CSV export** of filtered results

### 3. Route & Navigation

- Register `/super-admin/activity` in `App.tsx` with `requireSuperAdmin`
- Add a quick-action button on the Super Admin Dashboard linking to this page
- Add navigation link in Layout sidebar for super admins

### 4. Log Insertion Points

Instrument existing mutation flows to insert activity logs:
- **TenantManagement.tsx**: On tenant create, delete, trial extend, plan change
- **SupportManagement.tsx**: On ticket status change
- **UserManagement.tsx**: On user role changes
- **auto-provision-tenant edge function**: On new church signup

### 5. Translations

Add keys under `superAdmin.activityLog.*` for EN/FR/HT:
- Title, subtitle, filter labels, event type names, empty state, export button

### Technical Notes
- Reuses existing patterns: `useQuery` with pagination, `Layout` wrapper, `Card` components, `exportToCsv`
- RLS restricted to super admins only
- The `metadata` JSONB column keeps it flexible for different event types without schema changes
- Indexes on `created_at`, `event_category`, and `tenant_id` for performant filtering

