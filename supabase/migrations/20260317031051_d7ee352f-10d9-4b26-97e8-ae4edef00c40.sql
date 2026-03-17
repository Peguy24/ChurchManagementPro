
-- Archive tables
CREATE TABLE public.attendance_records_archive (
  id uuid PRIMARY KEY,
  member_id uuid NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  event_id uuid,
  branch_id uuid,
  marked_at timestamptz,
  marked_by uuid,
  scan_method text,
  tenant_id uuid,
  created_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.donations_archive (
  id uuid PRIMARY KEY,
  member_id uuid,
  amount numeric NOT NULL,
  donation_type text NOT NULL,
  donation_date date NOT NULL,
  payment_method text NOT NULL,
  description text,
  notes text,
  category_id uuid,
  branch_id uuid,
  bank_account_id uuid,
  cash_register_id uuid,
  created_by uuid,
  tenant_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.expenses_archive (
  id uuid PRIMARY KEY,
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  vendor text,
  payment_method text,
  reference_number text,
  receipt_url text,
  notes text,
  status text,
  category_id uuid,
  branch_id uuid,
  bank_account_id uuid,
  cash_register_id uuid,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  tenant_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.data_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  data_type text NOT NULL,
  records_archived integer NOT NULL DEFAULT 0,
  date_before date NOT NULL,
  archived_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_records_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- RLS: read-only for tenant admins
CREATE POLICY "Tenant admins can read attendance archive"
  ON public.attendance_records_archive FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant admins can read donations archive"
  ON public.donations_archive FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant admins can read expenses archive"
  ON public.expenses_archive FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id(auth.uid())));

CREATE POLICY "Tenant admins can read cleanup logs"
  ON public.data_cleanup_logs FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_user_tenant_id(auth.uid())));

-- Archive functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.archive_tenant_attendance(_tenant_id uuid, _before_date date, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count integer;
BEGIN
  IF NOT is_tenant_admin(_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.attendance_records
    WHERE tenant_id = _tenant_id AND event_date < _before_date
    RETURNING *
  )
  INSERT INTO public.attendance_records_archive
    (id, member_id, event_type, event_date, event_id, branch_id, marked_at, marked_by, scan_method, tenant_id, created_at, archived_at, archived_by)
  SELECT id, member_id, event_type, event_date, event_id, branch_id, marked_at, marked_by, scan_method, tenant_id, created_at, now(), _user_id
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_tenant_donations(_tenant_id uuid, _before_date date, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count integer;
BEGIN
  IF NOT is_tenant_admin(_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.donations
    WHERE tenant_id = _tenant_id AND donation_date < _before_date
    RETURNING *
  )
  INSERT INTO public.donations_archive
    (id, member_id, amount, donation_type, donation_date, payment_method, description, notes, category_id, branch_id, bank_account_id, cash_register_id, created_by, tenant_id, created_at, updated_at, archived_at, archived_by)
  SELECT id, member_id, amount, donation_type, donation_date, payment_method, description, notes, category_id, branch_id, bank_account_id, cash_register_id, created_by, tenant_id, created_at, updated_at, now(), _user_id
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_tenant_expenses(_tenant_id uuid, _before_date date, _user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count integer;
BEGIN
  IF NOT is_tenant_admin(_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.expenses
    WHERE tenant_id = _tenant_id AND expense_date < _before_date
    RETURNING *
  )
  INSERT INTO public.expenses_archive
    (id, description, amount, expense_date, vendor, payment_method, reference_number, receipt_url, notes, status, category_id, branch_id, bank_account_id, cash_register_id, created_by, approved_by, approved_at, tenant_id, created_at, updated_at, archived_at, archived_by)
  SELECT id, description, amount, expense_date, vendor, payment_method, reference_number, receipt_url, notes, status::text, category_id, branch_id, bank_account_id, cash_register_id, created_by, approved_by, approved_at, tenant_id, created_at, updated_at, now(), _user_id
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Get archived stats for a member
CREATE OR REPLACE FUNCTION public.get_member_archived_stats(_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  att_count bigint;
  att_min date;
  att_max date;
  don_count bigint;
  don_total numeric;
  don_min date;
  don_max date;
BEGIN
  SELECT COUNT(*), MIN(event_date), MAX(event_date)
  INTO att_count, att_min, att_max
  FROM public.attendance_records_archive WHERE member_id = _member_id;

  SELECT COUNT(*), COALESCE(SUM(amount), 0), MIN(donation_date), MAX(donation_date)
  INTO don_count, don_total, don_min, don_max
  FROM public.donations_archive WHERE member_id = _member_id;

  result := jsonb_build_object(
    'attendance_count', COALESCE(att_count, 0),
    'attendance_min_date', att_min,
    'attendance_max_date', att_max,
    'donations_count', COALESCE(don_count, 0),
    'donations_total', COALESCE(don_total, 0),
    'donations_min_date', don_min,
    'donations_max_date', don_max
  );

  RETURN result;
END;
$$;
