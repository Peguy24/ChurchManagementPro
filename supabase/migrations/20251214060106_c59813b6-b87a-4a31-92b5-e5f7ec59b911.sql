-- Create income categories table (fixed categories: tithes, offerings, donations, activities)
CREATE TABLE public.income_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert fixed income categories
INSERT INTO public.income_categories (name, code, description, display_order) VALUES
  ('Dîmes', 'tithe', 'Contributions régulières des membres', 1),
  ('Offrandes', 'offering', 'Offrandes lors des cultes', 2),
  ('Dons', 'donation', 'Dons ponctuels', 3),
  ('Activités', 'activity', 'Recettes des activités spéciales', 4);

-- Create special funds table
CREATE TABLE public.special_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_amount numeric DEFAULT 0,
  current_amount numeric DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create fund transactions table
CREATE TABLE public.fund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id uuid NOT NULL REFERENCES public.special_funds(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  amount numeric NOT NULL,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create cash registers table (caisse physique)
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id),
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  responsible_id uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create cash transactions table
CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer_in', 'transfer_out')),
  amount numeric NOT NULL,
  description text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text,
  linked_donation_id uuid REFERENCES public.donations(id),
  linked_expense_id uuid REFERENCES public.expenses(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create audit log table for financial transactions
CREATE TABLE public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject')),
  old_values jsonb,
  new_values jsonb,
  user_id uuid,
  user_email text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for income_categories (read-only for most users)
CREATE POLICY "Authenticated users can view income categories"
ON public.income_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage income categories"
ON public.income_categories FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for special_funds
CREATE POLICY "Authenticated users can view special funds"
ON public.special_funds FOR SELECT USING (true);

CREATE POLICY "Treasurers and admins can insert special funds"
ON public.special_funds FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Treasurers and admins can update special funds"
ON public.special_funds FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete special funds"
ON public.special_funds FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for fund_transactions
CREATE POLICY "Authenticated users can view fund transactions"
ON public.fund_transactions FOR SELECT USING (true);

CREATE POLICY "Treasurers and admins can insert fund transactions"
ON public.fund_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete fund transactions"
ON public.fund_transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for cash_registers
CREATE POLICY "Authenticated users can view cash registers"
ON public.cash_registers FOR SELECT USING (true);

CREATE POLICY "Treasurers and admins can manage cash registers"
ON public.cash_registers FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

-- RLS policies for cash_transactions
CREATE POLICY "Authenticated users can view cash transactions"
ON public.cash_transactions FOR SELECT USING (true);

CREATE POLICY "Treasurers and admins can insert cash transactions"
ON public.cash_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins can delete cash transactions"
ON public.cash_transactions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for financial_audit_logs (read-only for admins)
CREATE POLICY "Admins can view audit logs"
ON public.financial_audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.financial_audit_logs FOR INSERT
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_income_categories_updated_at
BEFORE UPDATE ON public.income_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_special_funds_updated_at
BEFORE UPDATE ON public.special_funds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cash_registers_updated_at
BEFORE UPDATE ON public.cash_registers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_special_funds_branch_id ON public.special_funds(branch_id);
CREATE INDEX idx_special_funds_status ON public.special_funds(status);
CREATE INDEX idx_fund_transactions_fund_id ON public.fund_transactions(fund_id);
CREATE INDEX idx_fund_transactions_date ON public.fund_transactions(transaction_date);
CREATE INDEX idx_cash_registers_branch_id ON public.cash_registers(branch_id);
CREATE INDEX idx_cash_transactions_register_id ON public.cash_transactions(cash_register_id);
CREATE INDEX idx_cash_transactions_date ON public.cash_transactions(transaction_date);
CREATE INDEX idx_financial_audit_logs_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX idx_financial_audit_logs_date ON public.financial_audit_logs(created_at);

-- Create function to log financial changes
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_val text;
BEGIN
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, new_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), auth.uid(), user_email_val);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), user_email_val);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), auth.uid(), user_email_val);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit triggers for financial tables
CREATE TRIGGER audit_donations
AFTER INSERT OR UPDATE OR DELETE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

CREATE TRIGGER audit_expenses
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

CREATE TRIGGER audit_special_funds
AFTER INSERT OR UPDATE OR DELETE ON public.special_funds
FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

CREATE TRIGGER audit_fund_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.fund_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

CREATE TRIGGER audit_cash_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();