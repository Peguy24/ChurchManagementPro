
CREATE OR REPLACE FUNCTION public.get_tenant_onboarding_state(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  _profile_completed boolean;
  _logo_uploaded boolean;
  _has_members boolean;
  _has_events boolean;
  _has_donations boolean;
  _has_branches boolean;
  _has_invites boolean;
BEGIN
  -- Check profile: church_name setting
  SELECT EXISTS(
    SELECT 1 FROM public.church_settings
    WHERE tenant_id = _tenant_id AND setting_key = 'church_name'
      AND setting_value IS NOT NULL AND trim(setting_value) != ''
  ) INTO _profile_completed;

  -- Check logo
  SELECT EXISTS(
    SELECT 1 FROM public.church_settings
    WHERE tenant_id = _tenant_id AND setting_key IN ('church_logo_url', 'church_logo')
      AND setting_value IS NOT NULL AND trim(setting_value) != ''
  ) OR EXISTS(
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id AND logo_url IS NOT NULL AND trim(logo_url) != ''
  ) INTO _logo_uploaded;

  -- Check members
  SELECT EXISTS(SELECT 1 FROM public.members WHERE tenant_id = _tenant_id LIMIT 1) INTO _has_members;

  -- Check events
  SELECT EXISTS(SELECT 1 FROM public.events WHERE tenant_id = _tenant_id LIMIT 1) INTO _has_events;

  -- Check donations
  SELECT EXISTS(SELECT 1 FROM public.donations WHERE tenant_id = _tenant_id LIMIT 1) INTO _has_donations;

  -- Check branches
  SELECT EXISTS(SELECT 1 FROM public.branches WHERE tenant_id = _tenant_id LIMIT 1) INTO _has_branches;

  -- Check admin invitations
  SELECT EXISTS(SELECT 1 FROM public.admin_invitations WHERE tenant_id = _tenant_id LIMIT 1) INTO _has_invites;

  result := jsonb_build_object(
    'step_profile_completed', _profile_completed,
    'step_logo_uploaded', _logo_uploaded,
    'step_first_member_added', _has_members,
    'step_first_event_created', _has_events,
    'step_first_donation_recorded', _has_donations,
    'step_first_branch_created', _has_branches,
    'step_admin_invited', _has_invites
  );

  RETURN result;
END;
$$;
