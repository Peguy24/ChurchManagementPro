
-- =============================================
-- STEP 1: Add tenant_id columns where missing
-- =============================================

-- cash_transactions
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- fund_transactions
ALTER TABLE public.fund_transactions ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- budgets
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- salary_payments
ALTER TABLE public.salary_payments ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- expense_categories
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- income_categories
ALTER TABLE public.income_categories ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- inventory_maintenance
ALTER TABLE public.inventory_maintenance ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- =============================================
-- STEP 2: Drop old RLS policies and create tenant-aware ones
-- =============================================

-- === cash_transactions ===
DROP POLICY IF EXISTS "Financial staff can view cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Treasurers and admins can insert cash transactions" ON public.cash_transactions;
DROP POLICY IF EXISTS "Admins can delete cash transactions" ON public.cash_transactions;

CREATE POLICY "Tenant financial staff can view cash transactions"
ON public.cash_transactions FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can insert cash transactions"
ON public.cash_transactions FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete cash transactions"
ON public.cash_transactions FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can update cash transactions"
ON public.cash_transactions FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === fund_transactions ===
DROP POLICY IF EXISTS "Financial staff can view fund transactions" ON public.fund_transactions;
DROP POLICY IF EXISTS "Treasurers and admins can insert fund transactions" ON public.fund_transactions;
DROP POLICY IF EXISTS "Admins can delete fund transactions" ON public.fund_transactions;

CREATE POLICY "Tenant financial staff can view fund transactions"
ON public.fund_transactions FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can insert fund transactions"
ON public.fund_transactions FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete fund transactions"
ON public.fund_transactions FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can update fund transactions"
ON public.fund_transactions FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === budgets ===
DROP POLICY IF EXISTS "Financial staff can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "Treasurers and admins can insert budgets" ON public.budgets;
DROP POLICY IF EXISTS "Treasurers and admins can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Admins can delete budgets" ON public.budgets;

CREATE POLICY "Tenant financial staff can view budgets"
ON public.budgets FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can insert budgets"
ON public.budgets FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can update budgets"
ON public.budgets FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete budgets"
ON public.budgets FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === salary_payments ===
DROP POLICY IF EXISTS "Financial staff can view salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Admins and treasurers can insert salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Admins and treasurers can update salary payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Admins can delete salary payments" ON public.salary_payments;

CREATE POLICY "Tenant financial staff can view salary payments"
ON public.salary_payments FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can insert salary payments"
ON public.salary_payments FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can update salary payments"
ON public.salary_payments FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete salary payments"
ON public.salary_payments FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === expense_categories ===
DROP POLICY IF EXISTS "Authenticated users can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Treasurers and admins can manage expense categories" ON public.expense_categories;

CREATE POLICY "Tenant users can view expense categories"
ON public.expense_categories FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) OR tenant_id IS NULL) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can manage expense categories"
ON public.expense_categories FOR ALL
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === income_categories ===
DROP POLICY IF EXISTS "Authenticated users can view income categories" ON public.income_categories;
DROP POLICY IF EXISTS "Admins can manage income categories" ON public.income_categories;

CREATE POLICY "Tenant users can view income categories"
ON public.income_categories FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) OR tenant_id IS NULL) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can manage income categories"
ON public.income_categories FOR ALL
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

-- === inventory_maintenance ===
DROP POLICY IF EXISTS "Staff can view inventory maintenance" ON public.inventory_maintenance;
DROP POLICY IF EXISTS "Admins and secretaries can insert inventory maintenance" ON public.inventory_maintenance;
DROP POLICY IF EXISTS "Admins and secretaries can update inventory maintenance" ON public.inventory_maintenance;
DROP POLICY IF EXISTS "Admins can delete inventory maintenance" ON public.inventory_maintenance;

CREATE POLICY "Tenant staff can view inventory maintenance"
ON public.inventory_maintenance FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant staff can insert inventory maintenance"
ON public.inventory_maintenance FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant staff can update inventory maintenance"
ON public.inventory_maintenance FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete inventory maintenance"
ON public.inventory_maintenance FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);
