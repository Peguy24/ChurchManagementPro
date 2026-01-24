-- Create subscription audit logs table
CREATE TABLE public.subscription_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_type TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_subscription_audit_tenant ON public.subscription_audit_logs(tenant_id);
CREATE INDEX idx_subscription_audit_created ON public.subscription_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage audit logs
CREATE POLICY "Super admins can view all audit logs"
ON public.subscription_audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can insert audit logs"
ON public.subscription_audit_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add comment for documentation
COMMENT ON TABLE public.subscription_audit_logs IS 'Audit trail for subscription and trial modifications by super admins';