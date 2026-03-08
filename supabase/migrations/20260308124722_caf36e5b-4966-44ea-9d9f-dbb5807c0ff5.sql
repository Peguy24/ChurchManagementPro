
CREATE TABLE public.tenant_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_profile_completed boolean NOT NULL DEFAULT false,
  step_logo_uploaded boolean NOT NULL DEFAULT false,
  step_first_member_added boolean NOT NULL DEFAULT false,
  step_first_event_created boolean NOT NULL DEFAULT false,
  step_first_donation_recorded boolean NOT NULL DEFAULT false,
  step_first_branch_created boolean NOT NULL DEFAULT false,
  step_admin_invited boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Tenant admins can view their own onboarding progress
CREATE POLICY "Tenant users can view own onboarding" ON public.tenant_onboarding_progress
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Tenant admins can update their own onboarding progress
CREATE POLICY "Tenant admins can update own onboarding" ON public.tenant_onboarding_progress
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

-- System/super admin can insert onboarding progress
CREATE POLICY "System can insert onboarding progress" ON public.tenant_onboarding_progress
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()) OR is_super_admin(auth.uid()));

-- Super admins can delete
CREATE POLICY "Super admins can delete onboarding" ON public.tenant_onboarding_progress
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));
