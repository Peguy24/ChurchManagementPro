
-- Drop old global-role RLS policies on bank_transactions
DROP POLICY IF EXISTS "Admins can delete bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Financial staff can view bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Treasurers and admins can insert bank transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Treasurers and admins can update bank transactions" ON public.bank_transactions;

-- Create tenant-aware RLS policies for bank_transactions
-- We check via the linked bank_account's tenant_id
CREATE POLICY "Tenant financial staff can view bank transactions"
ON public.bank_transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_accounts ba 
    WHERE ba.id = bank_transactions.bank_account_id 
    AND (
      (ba.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), ba.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), ba.tenant_id, 'treasurer'::app_role) OR
        has_tenant_role(auth.uid(), ba.tenant_id, 'pastor'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant treasurers can insert bank transactions"
ON public.bank_transactions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bank_accounts ba 
    WHERE ba.id = bank_transactions.bank_account_id 
    AND (
      (ba.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), ba.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), ba.tenant_id, 'treasurer'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant treasurers can update bank transactions"
ON public.bank_transactions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_accounts ba 
    WHERE ba.id = bank_transactions.bank_account_id 
    AND (
      (ba.tenant_id = get_user_tenant_id(auth.uid()) AND (
        has_tenant_role(auth.uid(), ba.tenant_id, 'admin'::app_role) OR
        has_tenant_role(auth.uid(), ba.tenant_id, 'treasurer'::app_role)
      ))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Tenant admins can delete bank transactions"
ON public.bank_transactions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_accounts ba 
    WHERE ba.id = bank_transactions.bank_account_id 
    AND (
      (ba.tenant_id = get_user_tenant_id(auth.uid()) AND 
        has_tenant_role(auth.uid(), ba.tenant_id, 'admin'::app_role))
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
