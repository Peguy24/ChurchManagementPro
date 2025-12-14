-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.expense_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budgets table
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id),
  branch_id UUID REFERENCES public.branches(id),
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.expense_categories(id),
  branch_id UUID REFERENCES public.branches(id),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor TEXT,
  receipt_url TEXT,
  payment_method TEXT DEFAULT 'cash',
  reference_number TEXT,
  status transaction_status DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  branch_id UUID REFERENCES public.branches(id),
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bank_transactions table for reconciliation
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID,
  linked_donation_id UUID REFERENCES public.donations(id),
  linked_expense_id UUID REFERENCES public.expenses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Authenticated users can view expense categories"
ON public.expense_categories FOR SELECT
USING (true);

CREATE POLICY "Treasurers and admins can manage expense categories"
ON public.expense_categories FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

-- RLS Policies for budgets
CREATE POLICY "Authenticated users can view budgets"
ON public.budgets FOR SELECT
USING (true);

CREATE POLICY "Treasurers and admins can insert budgets"
ON public.budgets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurers and admins can update budgets"
ON public.budgets FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete budgets"
ON public.budgets FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for expenses
CREATE POLICY "Authenticated users can view expenses"
ON public.expenses FOR SELECT
USING (true);

CREATE POLICY "Treasurers and admins can insert expenses"
ON public.expenses FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurers and admins can update expenses"
ON public.expenses FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete expenses"
ON public.expenses FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for bank_accounts
CREATE POLICY "Authenticated users can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (true);

CREATE POLICY "Treasurers and admins can manage bank accounts"
ON public.bank_accounts FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

-- RLS Policies for bank_transactions
CREATE POLICY "Authenticated users can view bank transactions"
ON public.bank_transactions FOR SELECT
USING (true);

CREATE POLICY "Treasurers and admins can insert bank transactions"
ON public.bank_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurers and admins can update bank transactions"
ON public.bank_transactions FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete bank transactions"
ON public.bank_transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_budgets_fiscal_year ON public.budgets(fiscal_year);
CREATE INDEX idx_budgets_category ON public.budgets(category_id);
CREATE INDEX idx_budgets_branch ON public.budgets(branch_id);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON public.bank_transactions(is_reconciled);

-- Create triggers for updated_at
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
  ('Salaires', 'Salaires et avantages du personnel'),
  ('Entretien', 'Entretien des bâtiments et équipements'),
  ('Utilités', 'Électricité, eau, internet, téléphone'),
  ('Fournitures', 'Fournitures de bureau et matériel'),
  ('Missions', 'Soutien aux missions et évangélisation'),
  ('Événements', 'Organisation d''événements et activités'),
  ('Aide sociale', 'Assistance aux membres et communauté'),
  ('Formation', 'Formation et développement'),
  ('Transport', 'Frais de déplacement'),
  ('Autres', 'Autres dépenses diverses');