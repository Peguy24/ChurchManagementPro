
-- 1. Admin email RPC leak
CREATE OR REPLACE FUNCTION public.get_pending_super_admin_candidates()
 RETURNS TABLE(id uuid, first_name text, last_name text, email text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.first_name, p.last_name, au.email::text, p.created_at
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE public.is_super_admin(auth.uid())
    AND p.tenant_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur WHERE tur.user_id = p.id
    )
    AND EXISTS (
      SELECT 1 FROM public.super_admin_invitations sai
      WHERE lower(sai.email) = lower(au.email)
        AND sai.used_at IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role <> 'user'
    );
$function$;

REVOKE EXECUTE ON FUNCTION public.get_client_review_email_recipients() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nps_detractor_email_recipients() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_review_email_recipients() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_nps_detractor_email_recipients() TO service_role;

-- 2. Archive functions: require admin of the target tenant
CREATE OR REPLACE FUNCTION public.archive_tenant_attendance(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
BEGIN
  IF NOT (public.is_super_admin(_user_id)
          OR public.has_tenant_role(_user_id, _tenant_id, 'admin'::app_role)) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.archive_tenant_donations(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
BEGIN
  IF NOT (public.is_super_admin(_user_id)
          OR public.has_tenant_role(_user_id, _tenant_id, 'admin'::app_role)) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.archive_tenant_expenses(_tenant_id uuid, _before_date date, _user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  archived_count integer;
BEGIN
  IF NOT (public.is_super_admin(_user_id)
          OR public.has_tenant_role(_user_id, _tenant_id, 'admin'::app_role)) THEN
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
$function$;

-- 3. Member archived stats: tenant-scoped authorization
CREATE OR REPLACE FUNCTION public.get_member_archived_stats(_member_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  _tenant_id uuid;
  att_count bigint;
  att_min date;
  att_max date;
  don_count bigint;
  don_total numeric;
  don_min date;
  don_max date;
BEGIN
  SELECT m.tenant_id INTO _tenant_id FROM public.members m WHERE m.id = _member_id;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (
    auth.role() = 'service_role'
    OR public.is_super_admin(auth.uid())
    OR (
      public.is_approved_tenant_user(auth.uid(), _tenant_id)
      AND (
        public.has_tenant_role(auth.uid(), _tenant_id, 'admin'::app_role)
        OR public.has_tenant_role(auth.uid(), _tenant_id, 'pastor'::app_role)
        OR public.has_tenant_role(auth.uid(), _tenant_id, 'secretary'::app_role)
        OR public.has_tenant_role(auth.uid(), _tenant_id, 'treasurer'::app_role)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

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
$function$;

-- 4. Tenant analytics RPCs: restrict to own tenant / super admin / service role
CREATE OR REPLACE FUNCTION public.can_access_tenant_analytics(_tenant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.role() = 'service_role'
      OR public.is_super_admin(auth.uid())
      OR (_tenant_id IS NOT NULL AND _tenant_id = public.get_user_tenant_id(auth.uid()));
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_attendance(_tenant_id uuid)
 RETURNS TABLE(month date, total_records bigint, unique_members bigint, event_days bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT month, total_records, unique_members, event_days
  FROM public.mv_tenant_monthly_attendance
  WHERE tenant_id = _tenant_id
    AND public.can_access_tenant_analytics(_tenant_id)
  ORDER BY month DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_donations(_tenant_id uuid)
 RETURNS TABLE(month date, total_amount numeric, donation_count bigint, unique_donors bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT month, total_amount, donation_count, unique_donors
  FROM public.mv_tenant_monthly_donations
  WHERE tenant_id = _tenant_id
    AND public.can_access_tenant_analytics(_tenant_id)
  ORDER BY month DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_monthly_expenses(_tenant_id uuid)
 RETURNS TABLE(month date, total_amount numeric, expense_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT month, total_amount, expense_count
  FROM public.mv_tenant_monthly_expenses
  WHERE tenant_id = _tenant_id
    AND public.can_access_tenant_analytics(_tenant_id)
  ORDER BY month DESC;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_storage_usage(_tenant_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  total_bytes bigint;
BEGIN
  IF NOT public.can_access_tenant_analytics(_tenant_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0)
  INTO total_bytes
  FROM storage.objects o
  WHERE o.bucket_id IN ('member-photos', 'member-documents', 'inventory-photos', 'tenant-logos')
    AND o.name LIKE _tenant_id::text || '/%';

  RETURN total_bytes;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_tenant_referral_stats(_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invited int;
  _qualified int;
  _rewarded int;
  _free_days int;
BEGIN
  IF NOT public.can_access_tenant_analytics(_tenant_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO _invited
  FROM public.referrals WHERE referrer_tenant_id = _tenant_id;

  SELECT COUNT(*) INTO _qualified
  FROM public.referrals
  WHERE referrer_tenant_id = _tenant_id AND status IN ('qualified', 'rewarded');

  SELECT COUNT(*) INTO _rewarded
  FROM public.referrals
  WHERE referrer_tenant_id = _tenant_id AND status = 'rewarded';

  SELECT COALESCE(SUM(days_added), 0) INTO _free_days
  FROM public.referral_rewards WHERE tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'invited', _invited,
    'qualified', _qualified,
    'rewarded', _rewarded,
    'free_days_earned', _free_days,
    'free_months_earned', ROUND(_free_days::numeric / 30, 1)
  );
END;
$function$;

-- 5. member_photo_links: token is server-side only
REVOKE SELECT ON public.member_photo_links FROM authenticated, anon;
GRANT SELECT (id, tenant_id, member_id, created_by, created_at, expires_at, used_at) ON public.member_photo_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.member_photo_links TO authenticated;
GRANT ALL ON public.member_photo_links TO service_role;

-- 6. platform_settings: narrow anonymous read scope
DROP POLICY IF EXISTS "Public read of client-visible platform settings" ON public.platform_settings;

CREATE POLICY "Anon read of minimal platform settings"
ON public.platform_settings
FOR SELECT
TO anon
USING (setting_key = ANY (ARRAY['maintenance_mode','feature_flags','welcome_message']));

CREATE POLICY "Authenticated read of client-visible platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (setting_key = ANY (ARRAY[
  'maintenance_mode','feature_flags','welcome_message',
  'trial_duration_days','trial_plan_limits',
  'plan_gratuit_limits','plan_essentiel_limits',
  'plan_professionnel_limits','plan_entreprise_limits'
]));

-- 7. tenant_custom_role_permissions: enforce tenant scoping on the join
DROP POLICY IF EXISTS "Users can view their own custom role permissions" ON public.tenant_custom_role_permissions;

CREATE POLICY "Users can view their own custom role permissions"
ON public.tenant_custom_role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tenant_user_roles tur
    JOIN public.tenant_custom_roles tcr
      ON tcr.id = tur.custom_role_id
     AND tcr.tenant_id = tur.tenant_id
    WHERE tur.custom_role_id = tenant_custom_role_permissions.custom_role_id
      AND tcr.id = tenant_custom_role_permissions.custom_role_id
      AND tur.user_id = auth.uid()
      AND tur.is_approved = true
  )
);
