
-- 1. Platform Employees
CREATE TABLE public.platform_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_title TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'full-time',
  hire_date DATE,
  salary_amount NUMERIC NOT NULL DEFAULT 0,
  pay_frequency TEXT NOT NULL DEFAULT 'monthly',
  tax_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  bank_info TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform_employees" ON public.platform_employees
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_platform_employees_updated_at
  BEFORE UPDATE ON public.platform_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. Platform Payroll
CREATE TABLE public.platform_payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.platform_employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  deductions JSONB NOT NULL DEFAULT '{}',
  net_amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform_payroll" ON public.platform_payroll
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- 3. Platform Tax Records
CREATE TABLE public.platform_tax_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_type TEXT NOT NULL DEFAULT 'other',
  tax_period TEXT NOT NULL,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  filing_notes TEXT,
  document_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_tax_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform_tax_records" ON public.platform_tax_records
  FOR ALL USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_platform_tax_records_updated_at
  BEFORE UPDATE ON public.platform_tax_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
