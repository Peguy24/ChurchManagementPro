
-- Create employees table for staff management
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  salary_amount NUMERIC NOT NULL DEFAULT 0,
  payment_frequency TEXT DEFAULT 'monthly',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  branch_id UUID REFERENCES public.branches(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary_payments table for payment history
CREATE TABLE public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  cash_register_id UUID REFERENCES public.cash_registers(id),
  reference_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'paid',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Financial staff can view employees" 
ON public.employees FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role) OR has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Admins and treasurers can insert employees" 
ON public.employees FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role));

CREATE POLICY "Admins and treasurers can update employees" 
ON public.employees FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role));

CREATE POLICY "Admins can delete employees" 
ON public.employees FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for salary_payments
CREATE POLICY "Financial staff can view salary payments" 
ON public.salary_payments FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role) OR has_role(auth.uid(), 'pastor'::app_role));

CREATE POLICY "Admins and treasurers can insert salary payments" 
ON public.salary_payments FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role));

CREATE POLICY "Admins and treasurers can update salary payments" 
ON public.salary_payments FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'treasurer'::app_role));

CREATE POLICY "Admins can delete salary payments" 
ON public.salary_payments FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_employees_branch ON public.employees(branch_id);
CREATE INDEX idx_salary_payments_employee ON public.salary_payments(employee_id);
CREATE INDEX idx_salary_payments_date ON public.salary_payments(payment_date);

-- Add triggers for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
