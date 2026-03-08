
CREATE TABLE public.tenant_health_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  overall_score numeric NOT NULL DEFAULT 0,
  member_engagement_score numeric NOT NULL DEFAULT 0,
  attendance_score numeric NOT NULL DEFAULT 0,
  donation_score numeric NOT NULL DEFAULT 0,
  feature_adoption_score numeric NOT NULL DEFAULT 0,
  total_members integer NOT NULL DEFAULT 0,
  active_members_30d integer NOT NULL DEFAULT 0,
  attendance_rate_30d numeric NOT NULL DEFAULT 0,
  total_donations_30d numeric NOT NULL DEFAULT 0,
  avg_donation numeric NOT NULL DEFAULT 0,
  features_used integer NOT NULL DEFAULT 0,
  features_total integer NOT NULL DEFAULT 8,
  health_grade text NOT NULL DEFAULT 'C',
  trend text NOT NULL DEFAULT 'stable',
  details jsonb DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view health scores"
  ON public.tenant_health_scores FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage health scores"
  ON public.tenant_health_scores FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE INDEX idx_tenant_health_scores_overall ON public.tenant_health_scores(overall_score DESC);
CREATE INDEX idx_tenant_health_scores_tenant ON public.tenant_health_scores(tenant_id);
