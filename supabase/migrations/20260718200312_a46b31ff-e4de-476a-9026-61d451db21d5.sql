
-- Status components
CREATE TABLE public.status_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','partial_outage','major_outage','maintenance')),
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_components TO anon, authenticated;
GRANT ALL ON public.status_components TO service_role;
ALTER TABLE public.status_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active status components" ON public.status_components FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins manage status components" ON public.status_components FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_status_components_updated BEFORE UPDATE ON public.status_components FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Status incidents
CREATE TABLE public.status_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','identified','monitoring','resolved')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','major','critical','maintenance')),
  affected_component_ids UUID[] NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.status_incidents TO anon, authenticated;
GRANT ALL ON public.status_incidents TO service_role;
ALTER TABLE public.status_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view incidents" ON public.status_incidents FOR SELECT USING (true);
CREATE POLICY "Super admins manage incidents" ON public.status_incidents FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_status_incidents_updated BEFORE UPDATE ON public.status_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_status_incidents_started ON public.status_incidents(started_at DESC);

-- Changelog entries
CREATE TABLE public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'improvement' CHECK (category IN ('feature','improvement','fix','security','announcement')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.changelog_entries TO anon, authenticated;
GRANT ALL ON public.changelog_entries TO service_role;
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published changelog" ON public.changelog_entries FOR SELECT USING (is_published = true);
CREATE POLICY "Super admins view all changelog" ON public.changelog_entries FOR SELECT USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins manage changelog" ON public.changelog_entries FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_changelog_updated BEFORE UPDATE ON public.changelog_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_changelog_published ON public.changelog_entries(published_at DESC) WHERE is_published = true;

-- Failed payments (dunning)
CREATE TABLE public.failed_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'usd',
  failure_reason TEXT,
  failure_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','retrying','resolved','abandoned','manual_review')),
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.failed_payments TO authenticated;
GRANT ALL ON public.failed_payments TO service_role;
ALTER TABLE public.failed_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins manage failed payments" ON public.failed_payments FOR ALL USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Tenant admins view own failed payments" ON public.failed_payments FOR SELECT USING (
  tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_tenant_admin(auth.uid())
);
CREATE TRIGGER trg_failed_payments_updated BEFORE UPDATE ON public.failed_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_failed_payments_status ON public.failed_payments(status, next_retry_at);
CREATE INDEX idx_failed_payments_tenant ON public.failed_payments(tenant_id);

-- Seed default status components
INSERT INTO public.status_components (name, description, position) VALUES
  ('API', 'Core application API', 1),
  ('Database', 'Data storage & queries', 2),
  ('Authentication', 'Sign-in & user sessions', 3),
  ('Email Delivery', 'Transactional & auth emails', 4),
  ('File Storage', 'Photos, documents & uploads', 5),
  ('Payments', 'Stripe billing & subscriptions', 6);

-- Onboarding funnel analytics view (uses existing tenant_onboarding_progress + tenants)
CREATE OR REPLACE VIEW public.v_onboarding_funnel AS
SELECT
  COUNT(*) FILTER (WHERE t.id IS NOT NULL) AS total_tenants,
  COUNT(*) FILTER (WHERE top.step_profile_completed) AS step_profile,
  COUNT(*) FILTER (WHERE top.step_logo_uploaded) AS step_logo,
  COUNT(*) FILTER (WHERE top.step_first_branch_created) AS step_branch,
  COUNT(*) FILTER (WHERE top.step_first_member_added) AS step_member,
  COUNT(*) FILTER (WHERE top.step_first_event_created) AS step_event,
  COUNT(*) FILTER (WHERE top.step_first_donation_recorded) AS step_donation,
  COUNT(*) FILTER (WHERE top.step_admin_invited) AS step_invite
FROM public.tenants t
LEFT JOIN public.tenant_onboarding_progress top ON top.tenant_id = t.id;
GRANT SELECT ON public.v_onboarding_funnel TO authenticated;
