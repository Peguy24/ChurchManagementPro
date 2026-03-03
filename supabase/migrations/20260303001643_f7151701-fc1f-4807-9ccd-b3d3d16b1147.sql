
-- Table for external member registration requests
CREATE TABLE public.member_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  emergency_phone text,
  address jsonb,
  academic_formation text,
  professional_formation text,
  baptism_status text,
  baptism_date date,
  origin_church text,
  conversion_date date,
  christian_experience text,
  marital_status text,
  spouse_name text,
  marriage_date date,
  number_of_children integer DEFAULT 0,
  children_names text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form - no auth required)
CREATE POLICY "Anyone can submit member requests"
ON public.member_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Tenant admins and super admins can view requests for their tenant
CREATE POLICY "Tenant admins can view member requests"
ON public.member_requests
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
    OR has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tenant admins can update (approve/reject)
CREATE POLICY "Tenant admins can update member requests"
ON public.member_requests
FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Tenant admins can delete
CREATE POLICY "Tenant admins can delete member requests"
ON public.member_requests
FOR DELETE
USING (
  (tenant_id = get_user_tenant_id(auth.uid()) AND has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_member_requests_updated_at
BEFORE UPDATE ON public.member_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
