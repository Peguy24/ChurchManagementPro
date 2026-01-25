-- Create member_engagement_scores table for storing calculated engagement metrics
CREATE TABLE public.member_engagement_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attendance_score NUMERIC(5,2) DEFAULT 0,
  giving_score NUMERIC(5,2) DEFAULT 0,
  ministry_score NUMERIC(5,2) DEFAULT 0,
  growth_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')) DEFAULT 'stable',
  trend_change NUMERIC(5,2) DEFAULT 0,
  last_attendance_date DATE,
  attendance_count_90d INTEGER DEFAULT 0,
  giving_consistency NUMERIC(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id)
);

-- Create member_risk_predictions table for churn prediction
CREATE TABLE public.member_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  risk_probability NUMERIC(5,4) DEFAULT 0,
  risk_category TEXT CHECK (risk_category IN ('low', 'medium', 'high')) DEFAULT 'low',
  contributing_factors JSONB DEFAULT '[]'::jsonb,
  days_since_last_attendance INTEGER,
  attendance_trend_slope NUMERIC(8,4),
  giving_trend_slope NUMERIC(8,4),
  predicted_inactive_date DATE,
  model_version TEXT DEFAULT 'v1.0',
  predicted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id)
);

-- Create pastoral_alerts table for smart alerts
CREATE TABLE public.pastoral_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'attendance_cliff',
    'giving_decline', 
    'ministry_absence',
    're_engagement',
    'new_member_plateau',
    'spiritual_milestone',
    'birthday_upcoming',
    'membership_anniversary',
    'high_churn_risk',
    'engagement_drop'
  )),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'celebration')) DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  action_suggested TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_engagement_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pastoral_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for member_engagement_scores
CREATE POLICY "Tenant users can view engagement scores"
ON public.member_engagement_scores FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can insert engagement scores"
ON public.member_engagement_scores FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can update engagement scores"
ON public.member_engagement_scores FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete engagement scores"
ON public.member_engagement_scores FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for member_risk_predictions
CREATE POLICY "Tenant leadership can view risk predictions"
ON public.member_risk_predictions FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can insert risk predictions"
ON public.member_risk_predictions FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can update risk predictions"
ON public.member_risk_predictions FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete risk predictions"
ON public.member_risk_predictions FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for pastoral_alerts
CREATE POLICY "Tenant staff can view alerts"
ON public.pastoral_alerts FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid())) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant leadership can insert alerts"
ON public.pastoral_alerts FOR INSERT
WITH CHECK (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant staff can update alerts"
ON public.pastoral_alerts FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete alerts"
ON public.pastoral_alerts FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create indexes for performance
CREATE INDEX idx_engagement_scores_member ON public.member_engagement_scores(member_id);
CREATE INDEX idx_engagement_scores_tenant ON public.member_engagement_scores(tenant_id);
CREATE INDEX idx_engagement_scores_total ON public.member_engagement_scores(total_score DESC);
CREATE INDEX idx_engagement_scores_trend ON public.member_engagement_scores(trend);

CREATE INDEX idx_risk_predictions_member ON public.member_risk_predictions(member_id);
CREATE INDEX idx_risk_predictions_tenant ON public.member_risk_predictions(tenant_id);
CREATE INDEX idx_risk_predictions_category ON public.member_risk_predictions(risk_category);
CREATE INDEX idx_risk_predictions_probability ON public.member_risk_predictions(risk_probability DESC);

CREATE INDEX idx_pastoral_alerts_member ON public.pastoral_alerts(member_id);
CREATE INDEX idx_pastoral_alerts_tenant ON public.pastoral_alerts(tenant_id);
CREATE INDEX idx_pastoral_alerts_type ON public.pastoral_alerts(alert_type);
CREATE INDEX idx_pastoral_alerts_priority ON public.pastoral_alerts(priority);
CREATE INDEX idx_pastoral_alerts_unresolved ON public.pastoral_alerts(tenant_id, is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_pastoral_alerts_assigned ON public.pastoral_alerts(assigned_to) WHERE assigned_to IS NOT NULL;

-- Add triggers for updated_at
CREATE TRIGGER update_engagement_scores_updated_at
  BEFORE UPDATE ON public.member_engagement_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_risk_predictions_updated_at
  BEFORE UPDATE ON public.member_risk_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_pastoral_alerts_updated_at
  BEFORE UPDATE ON public.pastoral_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();