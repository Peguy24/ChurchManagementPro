-- Secure materialized views: enable RLS via wrapper functions instead of direct access
-- Revoke direct access from anon role
REVOKE SELECT ON public.mv_tenant_monthly_donations FROM anon;
REVOKE SELECT ON public.mv_tenant_monthly_expenses FROM anon;
REVOKE SELECT ON public.mv_tenant_monthly_attendance FROM anon;

-- Create secure wrapper functions that enforce tenant isolation
CREATE OR REPLACE FUNCTION public.get_tenant_monthly_donations(_tenant_id uuid)
RETURNS TABLE(month date, total_amount numeric, donation_count bigint, unique_donors bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT month, total_amount, donation_count, unique_donors
  FROM public.mv_tenant_monthly_donations
  WHERE tenant_id = _tenant_id
  ORDER BY month DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_expenses(_tenant_id uuid)
RETURNS TABLE(month date, total_amount numeric, expense_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT month, total_amount, expense_count
  FROM public.mv_tenant_monthly_expenses
  WHERE tenant_id = _tenant_id
  ORDER BY month DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_attendance(_tenant_id uuid)
RETURNS TABLE(month date, total_records bigint, unique_members bigint, event_days bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT month, total_records, unique_members, event_days
  FROM public.mv_tenant_monthly_attendance
  WHERE tenant_id = _tenant_id
  ORDER BY month DESC;
$$;