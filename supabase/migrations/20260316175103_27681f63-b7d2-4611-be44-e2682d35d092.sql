UPDATE public.tenant_subscriptions 
SET status = 'active', 
    trial_ends_at = NULL,
    updated_at = now()
WHERE tenant_id = 'b921daeb-72bb-4774-88f9-ff79aff6bd9b' 
  AND status = 'trial';