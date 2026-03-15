
-- Credit Operations table
CREATE TABLE public.credit_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('credit_purchase', 'loan_received', 'loan_given')),
  counterparty text NOT NULL,
  description text NOT NULL,
  total_amount numeric NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  interest_rate numeric NOT NULL DEFAULT 0,
  notes text,
  branch_id uuid REFERENCES public.branches(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Credit Payments table
CREATE TABLE public.credit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_operation_id uuid REFERENCES public.credit_operations(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_operations
CREATE POLICY "Users can view credit operations of their tenant"
  ON public.credit_operations FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert credit operations for their tenant"
  ON public.credit_operations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update credit operations of their tenant"
  ON public.credit_operations FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete credit operations of their tenant"
  ON public.credit_operations FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- RLS policies for credit_payments
CREATE POLICY "Users can view credit payments of their tenant"
  ON public.credit_payments FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can insert credit payments for their tenant"
  ON public.credit_payments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete credit payments of their tenant"
  ON public.credit_payments FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Trigger to update amount_paid and status on credit_operations
CREATE OR REPLACE FUNCTION public.update_credit_operation_on_payment()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  total_payments numeric;
  op_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM public.credit_payments
  WHERE credit_operation_id = NEW.credit_operation_id;

  SELECT total_amount INTO op_total
  FROM public.credit_operations
  WHERE id = NEW.credit_operation_id;

  UPDATE public.credit_operations
  SET amount_paid = total_payments,
      status = CASE WHEN total_payments >= op_total THEN 'completed' ELSE 'active' END,
      updated_at = now()
  WHERE id = NEW.credit_operation_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_credit_on_payment
  AFTER INSERT ON public.credit_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_credit_operation_on_payment();

-- Updated_at trigger for credit_operations
CREATE TRIGGER update_credit_operations_updated_at
  BEFORE UPDATE ON public.credit_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
