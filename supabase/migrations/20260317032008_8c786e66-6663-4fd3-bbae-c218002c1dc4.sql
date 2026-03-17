
-- Allow super admins to read all archive tables
CREATE POLICY "Super admins can read all attendance archive"
  ON public.attendance_records_archive FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can read all donations archive"
  ON public.donations_archive FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can read all expenses archive"
  ON public.expenses_archive FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can read all cleanup logs"
  ON public.data_cleanup_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
