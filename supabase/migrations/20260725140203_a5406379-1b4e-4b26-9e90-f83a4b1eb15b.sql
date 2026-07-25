CREATE TABLE public.ai_tool_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  roles text[] NOT NULL DEFAULT '{}',
  tool_name text NOT NULL,
  rule text NOT NULL,
  table_name text,
  column_name text,
  required_scope text,
  message text NOT NULL,
  args jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_tool_denials_tenant_created ON public.ai_tool_denials (tenant_id, created_at DESC);

GRANT SELECT, INSERT ON public.ai_tool_denials TO authenticated;
GRANT ALL ON public.ai_tool_denials TO service_role;

ALTER TABLE public.ai_tool_denials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log their own denials"
ON public.ai_tool_denials FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant admins can view their denials"
ON public.ai_tool_denials FOR SELECT TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role));

CREATE POLICY "Super admins can view all denials"
ON public.ai_tool_denials FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));