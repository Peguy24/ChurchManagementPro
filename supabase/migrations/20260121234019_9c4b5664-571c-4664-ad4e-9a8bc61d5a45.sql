
-- Create table for admin invitation tokens
CREATE TABLE public.admin_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster token lookups
CREATE INDEX idx_admin_invitations_token ON public.admin_invitations(token);
CREATE INDEX idx_admin_invitations_email ON public.admin_invitations(email);
CREATE INDEX idx_admin_invitations_tenant ON public.admin_invitations(tenant_id);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can manage invitations
CREATE POLICY "Super admins can manage invitations"
ON public.admin_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read valid invitations by token (for validation during signup)
CREATE POLICY "Anyone can validate invitation tokens"
ON public.admin_invitations
FOR SELECT
USING (true);
