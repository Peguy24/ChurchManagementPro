
-- Create event_registrations table
CREATE TABLE public.event_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Anyone can register (public INSERT)
CREATE POLICY "Anyone can register for events"
ON public.event_registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Tenant staff can view registrations
CREATE POLICY "Tenant staff can view event registrations"
ON public.event_registrations
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tenant staff can update registrations (e.g. check-in)
CREATE POLICY "Tenant staff can update event registrations"
ON public.event_registrations
FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tenant admins can delete registrations
CREATE POLICY "Tenant admins can delete event registrations"
ON public.event_registrations
FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow anon to read event details for the registration form
CREATE POLICY "Anyone can view events for registration"
ON public.events
FOR SELECT
TO anon
USING (true);

-- Allow anon to read tenant info for branding
CREATE POLICY "Anyone can view tenant info for registration"
ON public.tenants
FOR SELECT
TO anon
USING (true);
