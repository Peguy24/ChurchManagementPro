
CREATE TABLE public.platform_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  vendor text,
  notes text,
  is_recurring boolean DEFAULT false,
  recurring_frequency text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view platform expenses"
  ON public.platform_expenses FOR SELECT
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert platform expenses"
  ON public.platform_expenses FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update platform expenses"
  ON public.platform_expenses FOR UPDATE
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete platform expenses"
  ON public.platform_expenses FOR DELETE
  USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_platform_expenses_updated_at
  BEFORE UPDATE ON public.platform_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
