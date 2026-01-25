-- Create table for Super Admin invitations (separate from tenant admin invitations)
CREATE TABLE public.super_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.super_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only Super Admins can view invitations
CREATE POLICY "Super admins can view invitations"
ON public.super_admin_invitations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only Super Admins can create invitations
CREATE POLICY "Super admins can create invitations"
ON public.super_admin_invitations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only Super Admins can update invitations (mark as used)
CREATE POLICY "Super admins can update invitations"
ON public.super_admin_invitations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only Super Admins can delete invitations
CREATE POLICY "Super admins can delete invitations"
ON public.super_admin_invitations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public read for token validation during registration (only unexpired, unused tokens)
CREATE POLICY "Public can validate active tokens"
ON public.super_admin_invitations
FOR SELECT
USING (
  used_at IS NULL 
  AND expires_at > now()
);