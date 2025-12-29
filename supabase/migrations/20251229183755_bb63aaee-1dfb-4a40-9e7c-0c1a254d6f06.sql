
-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('basic', 'standard', 'premium', 'enterprise');

-- Create enum for tenant status
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');

-- Create tenants table for multi-tenant management
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#6366f1',
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tenant subscriptions table
CREATE TABLE public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan subscription_plan NOT NULL DEFAULT 'basic',
    status tenant_status NOT NULL DEFAULT 'trial',
    price_monthly NUMERIC NOT NULL DEFAULT 0,
    max_members INTEGER DEFAULT 100,
    max_branches INTEGER DEFAULT 1,
    max_users INTEGER DEFAULT 5,
    max_storage_mb INTEGER DEFAULT 500,
    features JSONB DEFAULT '{"donations": true, "attendance": true, "events": true, "ministries": true, "inventory": false, "reports": true, "email_notifications": false}'::jsonb,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 month'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

-- Create tenant usage tracking table
CREATE TABLE public.tenant_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    members_count INTEGER DEFAULT 0,
    branches_count INTEGER DEFAULT 0,
    users_count INTEGER DEFAULT 0,
    storage_used_mb NUMERIC DEFAULT 0,
    donations_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add tenant_id to branches table for multi-tenancy
ALTER TABLE public.branches ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Enable RLS on all new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants (only super admins can manage)
CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can insert tenants"
ON public.tenants FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can update tenants"
ON public.tenants FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can delete tenants"
ON public.tenants FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tenant_subscriptions
CREATE POLICY "Super admins can view all subscriptions"
ON public.tenant_subscriptions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage subscriptions"
ON public.tenant_subscriptions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for tenant_usage
CREATE POLICY "Super admins can view all usage"
ON public.tenant_usage FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage usage"
ON public.tenant_usage FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_subscriptions_updated_at
BEFORE UPDATE ON public.tenant_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenant_usage_updated_at
BEFORE UPDATE ON public.tenant_usage
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
