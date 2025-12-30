-- Create table for church registration requests
CREATE TABLE public.tenant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  address text,
  requested_plan text NOT NULL DEFAULT 'basic',
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- Public can submit requests (no auth required)
CREATE POLICY "Anyone can submit a request"
ON public.tenant_requests
FOR INSERT
WITH CHECK (true);

-- Super admins can view all requests
CREATE POLICY "Super admins can view all requests"
ON public.tenant_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Super admins can update requests
CREATE POLICY "Super admins can update requests"
ON public.tenant_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Super admins can delete requests
CREATE POLICY "Super admins can delete requests"
ON public.tenant_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tenant_requests_updated_at
BEFORE UPDATE ON public.tenant_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();