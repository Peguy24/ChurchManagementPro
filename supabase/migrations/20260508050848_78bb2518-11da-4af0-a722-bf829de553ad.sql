CREATE TABLE public.tax_exemption_refunds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tax_exemption_id UUID REFERENCES public.tenant_tax_exemptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  tax_amount_refunded NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'succeeded',
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stripe_invoice_id)
);

CREATE INDEX idx_tax_exemption_refunds_tenant ON public.tax_exemption_refunds(tenant_id);

ALTER TABLE public.tax_exemption_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins view all tax refunds"
ON public.tax_exemption_refunds FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant admins view own tax refunds"
ON public.tax_exemption_refunds FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.is_tenant_admin(auth.uid())
);