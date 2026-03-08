
-- Service Roles table (worship, usher, tech, etc.)
CREATE TABLE public.service_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Volunteer Schedules table
CREATE TABLE public.volunteer_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  service_role_id UUID REFERENCES public.service_roles(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  service_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Visitors table
CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  how_heard TEXT,
  notes TEXT,
  follow_up_status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.members(id),
  converted_to_member_id UUID REFERENCES public.members(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Visitor Follow-ups table
CREATE TABLE public.visitor_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  follow_up_date DATE NOT NULL DEFAULT CURRENT_DATE,
  follow_up_type TEXT NOT NULL DEFAULT 'call',
  notes TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.service_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS for service_roles
CREATE POLICY "Tenant users can view service roles" ON public.service_roles
  FOR SELECT USING ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant admins can insert service roles" ON public.service_roles
  FOR INSERT WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant admins can update service roles" ON public.service_roles
  FOR UPDATE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant admins can delete service roles" ON public.service_roles
  FOR DELETE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS for volunteer_schedules
CREATE POLICY "Tenant users can view volunteer schedules" ON public.volunteer_schedules
  FOR SELECT USING ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant staff can insert volunteer schedules" ON public.volunteer_schedules
  FOR INSERT WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant staff can update volunteer schedules" ON public.volunteer_schedules
  FOR UPDATE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant admins can delete volunteer schedules" ON public.volunteer_schedules
  FOR DELETE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS for visitors
CREATE POLICY "Tenant users can view visitors" ON public.visitors
  FOR SELECT USING ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant staff can insert visitors" ON public.visitors
  FOR INSERT WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant staff can update visitors" ON public.visitors
  FOR UPDATE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant admins can delete visitors" ON public.visitors
  FOR DELETE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS for visitor_follow_ups
CREATE POLICY "Tenant users can view follow-ups" ON public.visitor_follow_ups
  FOR SELECT USING ((tenant_id = get_user_tenant_id(auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tenant staff can insert follow-ups" ON public.visitor_follow_ups
  FOR INSERT WITH CHECK (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant staff can update follow-ups" ON public.visitor_follow_ups
  FOR UPDATE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Tenant admins can delete follow-ups" ON public.visitor_follow_ups
  FOR DELETE USING (
    ((tenant_id = get_user_tenant_id(auth.uid())) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Indexes
CREATE INDEX idx_service_roles_tenant ON public.service_roles(tenant_id);
CREATE INDEX idx_volunteer_schedules_tenant ON public.volunteer_schedules(tenant_id);
CREATE INDEX idx_volunteer_schedules_date ON public.volunteer_schedules(service_date);
CREATE INDEX idx_volunteer_schedules_member ON public.volunteer_schedules(member_id);
CREATE INDEX idx_visitors_tenant ON public.visitors(tenant_id);
CREATE INDEX idx_visitors_status ON public.visitors(follow_up_status);
CREATE INDEX idx_visitor_follow_ups_visitor ON public.visitor_follow_ups(visitor_id);
