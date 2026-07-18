
DROP VIEW IF EXISTS public.v_onboarding_funnel;

CREATE OR REPLACE FUNCTION public.get_onboarding_funnel()
RETURNS TABLE(
  total_tenants bigint,
  step_profile bigint,
  step_logo bigint,
  step_branch bigint,
  step_member bigint,
  step_event bigint,
  step_donation bigint,
  step_invite bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE top.step_profile_completed)::bigint,
    COUNT(*) FILTER (WHERE top.step_logo_uploaded)::bigint,
    COUNT(*) FILTER (WHERE top.step_first_branch_created)::bigint,
    COUNT(*) FILTER (WHERE top.step_first_member_added)::bigint,
    COUNT(*) FILTER (WHERE top.step_first_event_created)::bigint,
    COUNT(*) FILTER (WHERE top.step_first_donation_recorded)::bigint,
    COUNT(*) FILTER (WHERE top.step_admin_invited)::bigint
  FROM public.tenants t
  LEFT JOIN public.tenant_onboarding_progress top ON top.tenant_id = t.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_onboarding_funnel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_funnel() TO authenticated;
