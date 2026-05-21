
-- Platform owners table
CREATE TABLE public.platform_owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  default_share_percent numeric NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage platform owners" ON public.platform_owners
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_platform_owners_updated_at
  BEFORE UPDATE ON public.platform_owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Funding source columns on platform_expenses
ALTER TABLE public.platform_expenses
  ADD COLUMN funding_source text NOT NULL DEFAULT 'business_checking',
  ADD COLUMN funding_source_label text;

-- Contributions table (per-owner split)
CREATE TABLE public.platform_expense_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.platform_expenses(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.platform_owners(id) ON DELETE RESTRICT,
  percent numeric NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_expense_contributions_expense ON public.platform_expense_contributions(expense_id);
CREATE INDEX idx_platform_expense_contributions_owner ON public.platform_expense_contributions(owner_id);

ALTER TABLE public.platform_expense_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage expense contributions" ON public.platform_expense_contributions
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
