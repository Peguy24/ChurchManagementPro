-- ==============================================
-- PERFORMANCE INDEXES FOR 3000+ TENANT SCALE
-- ==============================================

-- Composite indexes: tenant_id + most-filtered column
-- These dramatically speed up per-tenant queries

-- Attendance: most queried table (daily per member)
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date 
  ON public.attendance_records(tenant_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_member 
  ON public.attendance_records(tenant_id, member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_event_type 
  ON public.attendance_records(tenant_id, event_type);

-- Donations: high volume financial data
CREATE INDEX IF NOT EXISTS idx_donations_tenant_date 
  ON public.donations(tenant_id, donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_tenant_member 
  ON public.donations(tenant_id, member_id);

-- Expenses: financial queries always filtered by tenant
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date 
  ON public.expenses(tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_status 
  ON public.expenses(tenant_id, status);

-- Members: core table, always filtered by tenant + status
CREATE INDEX IF NOT EXISTS idx_members_tenant_status 
  ON public.members(tenant_id, status);

-- Events: filtered by tenant + date for calendars
CREATE INDEX IF NOT EXISTS idx_events_tenant_date 
  ON public.events(tenant_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_tenant_status 
  ON public.events(tenant_id, status);

-- Bank transactions: reconciliation queries
CREATE INDEX IF NOT EXISTS idx_bank_txn_account_date 
  ON public.bank_transactions(bank_account_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_reconciled 
  ON public.bank_transactions(bank_account_id, is_reconciled) 
  WHERE is_reconciled = false;

-- Cash transactions: daily register queries
CREATE INDEX IF NOT EXISTS idx_cash_txn_register_date 
  ON public.cash_transactions(cash_register_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_txn_tenant_date 
  ON public.cash_transactions(tenant_id, transaction_date DESC);

-- Financial audit logs: filtered by tenant + entity
CREATE INDEX IF NOT EXISTS idx_audit_tenant_date 
  ON public.financial_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_entity 
  ON public.financial_audit_logs(tenant_id, entity_type);

-- Inventory: per-tenant listing
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_status 
  ON public.inventory_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_category 
  ON public.inventory_items(tenant_id, category);

-- Tenant notifications: frequently queried
CREATE INDEX IF NOT EXISTS idx_tenant_notif_tenant_read 
  ON public.tenant_notifications(tenant_id, is_read, created_at DESC);

-- Profiles: tenant lookup
CREATE INDEX IF NOT EXISTS idx_profiles_tenant 
  ON public.profiles(tenant_id);

-- Tenant subscriptions: plan checks
CREATE INDEX IF NOT EXISTS idx_tenant_subs_tenant 
  ON public.tenant_subscriptions(tenant_id, status);

-- Budgets: fiscal year queries
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_year 
  ON public.budgets(tenant_id, fiscal_year);

-- Credit operations
CREATE INDEX IF NOT EXISTS idx_credit_ops_tenant_status 
  ON public.credit_operations(tenant_id, status);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_tenant_active 
  ON public.employees(tenant_id, is_active);

-- Church settings: key lookups per tenant
CREATE INDEX IF NOT EXISTS idx_church_settings_tenant_key 
  ON public.church_settings(tenant_id, setting_key);