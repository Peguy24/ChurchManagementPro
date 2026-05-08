ALTER TABLE public.tax_exemption_refunds
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_exemption_refunds_stripe_refund_id
  ON public.tax_exemption_refunds (stripe_refund_id)
  WHERE stripe_refund_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_tax_exemption_refunds_updated_at ON public.tax_exemption_refunds;
CREATE TRIGGER trg_tax_exemption_refunds_updated_at
  BEFORE UPDATE ON public.tax_exemption_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();