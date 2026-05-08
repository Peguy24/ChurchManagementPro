ALTER TABLE public.tenant_subscriptions
ADD COLUMN IF NOT EXISTS managed_by_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_managed_by_admin
ON public.tenant_subscriptions(managed_by_admin)
WHERE managed_by_admin = true;