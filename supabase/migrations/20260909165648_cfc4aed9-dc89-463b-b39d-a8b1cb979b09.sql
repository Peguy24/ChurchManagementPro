CREATE OR REPLACE FUNCTION public.archive_tenant_attendance(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
  actor uuid := COALESCE(auth.uid(), _user_id);
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT (public.is_super_admin(actor)
          OR public.has_tenant_role(actor, _tenant_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.attendance_records
    WHERE tenant_id = _tenant_id AND event_date < _before_date
    RETURNING *
  )
  INSERT INTO public.attendance_records_archive
    (id, member_id, event_type, event_date, event_id, branch_id, marked_at, marked_by, scan_method, tenant_id, created_at, archived_at, archived_by)
  SELECT id, member_id, event_type, event_date, event_id, branch_id, marked_at, marked_by, scan_method, tenant_id, created_at, now(), actor
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_tenant_donations(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
  actor uuid := COALESCE(auth.uid(), _user_id);
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT (public.is_super_admin(actor)
          OR public.has_tenant_role(actor, _tenant_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.donations
    WHERE tenant_id = _tenant_id AND donation_date < _before_date
    RETURNING *
  )
  INSERT INTO public.donations_archive
    (id, member_id, amount, donation_type, donation_date, payment_method, description, notes, category_id, branch_id, bank_account_id, cash_register_id, created_by, tenant_id, created_at, updated_at, archived_at, archived_by)
  SELECT id, member_id, amount, donation_type, donation_date, payment_method, description, notes, category_id, branch_id, bank_account_id, cash_register_id, created_by, tenant_id, created_at, updated_at, now(), actor
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_tenant_expenses(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
  actor uuid := COALESCE(auth.uid(), _user_id);
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF NOT (public.is_super_admin(actor)
          OR public.has_tenant_role(actor, _tenant_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH moved AS (
    DELETE FROM public.expenses
    WHERE tenant_id = _tenant_id AND expense_date < _before_date
    RETURNING *
  )
  INSERT INTO public.expenses_archive
    (id, description, amount, expense_date, vendor, payment_method, reference_number, receipt_url, notes, status, category_id, branch_id, bank_account_id, cash_register_id, created_by, approved_by, approved_at, tenant_id, created_at, updated_at, archived_at, archived_by)
  SELECT id, description, amount, expense_date, vendor, payment_method, reference_number, receipt_url, notes, status::text, category_id, branch_id, bank_account_id, cash_register_id, created_by, approved_by, approved_at, tenant_id, created_at, updated_at, now(), actor
  FROM moved;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.archive_tenant_attendance(uuid, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_tenant_donations(uuid, date, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.archive_tenant_expenses(uuid, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_tenant_attendance(uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_tenant_donations(uuid, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_tenant_expenses(uuid, date, uuid) TO authenticated, service_role;