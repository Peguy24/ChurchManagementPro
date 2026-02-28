
-- Drop old restrictive policies on email_templates
DROP POLICY IF EXISTS "Admins and pastors can view email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can delete email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Admins can update email templates" ON public.email_templates;

-- Create new PERMISSIVE policies that check both old and new role systems
CREATE POLICY "Staff can view email templates"
ON public.email_templates
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'pastor'::app_role)
  OR is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
);

CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_admin(auth.uid())
);
