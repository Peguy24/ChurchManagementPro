UPDATE public.tenant_subscriptions 
SET plan = 'free', 
    status = 'active',
    price_monthly = 0,
    max_members = 100,
    max_branches = 1,
    max_users = 3,
    trial_ends_at = NULL,
    updated_at = now()
WHERE tenant_id = 'b921daeb-72bb-4774-88f9-ff79aff6bd9b';