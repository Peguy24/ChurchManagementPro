
-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  category text NOT NULL DEFAULT 'general',
  admin_response text,
  responded_by uuid,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenant users can create tickets for their own tenant
CREATE POLICY "Tenant users can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id(auth.uid())
  AND user_id = auth.uid()
);

-- Tenant users can view their own tenant's tickets
CREATE POLICY "Tenant users can view own tenant tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id(auth.uid())
  OR is_super_admin(auth.uid())
);

-- Super admins can update all tickets (respond/close)
CREATE POLICY "Super admins can update tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admins can delete tickets
CREATE POLICY "Super admins can delete tickets"
ON public.support_tickets
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
