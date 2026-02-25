
-- Add tenant_id column to special_funds
ALTER TABLE public.special_funds ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- Update RLS policies to use tenant-based access
DROP POLICY IF EXISTS "Treasurers and admins can insert fund" ON public.special_funds;
DROP POLICY IF EXISTS "Financial staff can view special funds" ON public.special_funds;
DROP POLICY IF EXISTS "Admins can delete special funds" ON public.special_funds;
DROP POLICY IF EXISTS "Treasurers and admins can update special funds" ON public.special_funds;

-- New tenant-aware policies
CREATE POLICY "Tenant financial staff can view special funds"
ON public.special_funds FOR SELECT
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can insert special funds"
ON public.special_funds FOR INSERT
WITH CHECK (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant treasurers can update special funds"
ON public.special_funds FOR UPDATE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR
    has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Tenant admins can delete special funds"
ON public.special_funds FOR DELETE
USING (
  ((tenant_id = get_user_tenant_id(auth.uid())) AND
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
  ) OR has_role(auth.uid(), 'admin'::app_role)
);
