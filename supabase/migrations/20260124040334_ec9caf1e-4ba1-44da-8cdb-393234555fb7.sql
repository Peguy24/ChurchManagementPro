-- Allow tenant users to view their own tenant's subscription
CREATE POLICY "Tenant users can view their tenant subscription" 
ON public.tenant_subscriptions 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tur.tenant_id 
    FROM public.tenant_user_roles tur 
    WHERE tur.user_id = auth.uid() 
    AND tur.is_approved = true
  )
);