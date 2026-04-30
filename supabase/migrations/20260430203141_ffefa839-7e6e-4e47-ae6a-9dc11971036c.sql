
-- Add columns to platform_expenses
ALTER TABLE public.platform_expenses
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS receipt_filename text,
  ADD COLUMN IF NOT EXISTS tax_deductible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_category text;

-- Create private storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-expense-receipts', 'platform-expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: super admins only
DROP POLICY IF EXISTS "Super admins can view platform expense receipts" ON storage.objects;
CREATE POLICY "Super admins can view platform expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-expense-receipts' AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can upload platform expense receipts" ON storage.objects;
CREATE POLICY "Super admins can upload platform expense receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'platform-expense-receipts' AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can update platform expense receipts" ON storage.objects;
CREATE POLICY "Super admins can update platform expense receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'platform-expense-receipts' AND public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete platform expense receipts" ON storage.objects;
CREATE POLICY "Super admins can delete platform expense receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'platform-expense-receipts' AND public.is_super_admin(auth.uid()));
