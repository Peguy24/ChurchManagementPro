-- Materialized view: Monthly donation stats per tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_tenant_monthly_donations AS
SELECT 
  tenant_id,
  date_trunc('month', donation_date::timestamp)::date as month,
  SUM(amount) as total_amount,
  COUNT(*) as donation_count,
  COUNT(DISTINCT member_id) as unique_donors
FROM public.donations
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, date_trunc('month', donation_date::timestamp)::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_donations_tenant_month 
  ON public.mv_tenant_monthly_donations(tenant_id, month);

-- Materialized view: Monthly expense stats per tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_tenant_monthly_expenses AS
SELECT 
  tenant_id,
  date_trunc('month', expense_date::timestamp)::date as month,
  SUM(amount) as total_amount,
  COUNT(*) as expense_count
FROM public.expenses
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, date_trunc('month', expense_date::timestamp)::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_expenses_tenant_month 
  ON public.mv_tenant_monthly_expenses(tenant_id, month);

-- Materialized view: Monthly attendance stats per tenant
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_tenant_monthly_attendance AS
SELECT 
  tenant_id,
  date_trunc('month', event_date::timestamp)::date as month,
  COUNT(*) as total_records,
  COUNT(DISTINCT member_id) as unique_members,
  COUNT(DISTINCT event_date) as event_days
FROM public.attendance_records
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, date_trunc('month', event_date::timestamp)::date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_attendance_tenant_month 
  ON public.mv_tenant_monthly_attendance(tenant_id, month);

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION public.refresh_tenant_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_tenant_monthly_donations;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_tenant_monthly_expenses;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_tenant_monthly_attendance;
END;
$$;

-- Grant select on materialized views to authenticated users
GRANT SELECT ON public.mv_tenant_monthly_donations TO authenticated;
GRANT SELECT ON public.mv_tenant_monthly_expenses TO authenticated;
GRANT SELECT ON public.mv_tenant_monthly_attendance TO authenticated;