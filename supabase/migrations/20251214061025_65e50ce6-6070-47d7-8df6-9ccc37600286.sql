-- Add account reference columns to donations table
ALTER TABLE public.donations 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.income_categories(id),
ADD COLUMN IF NOT EXISTS cash_register_id uuid REFERENCES public.cash_registers(id),
ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id),
ADD COLUMN IF NOT EXISTS description text;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_donations_category_id ON public.donations(category_id);
CREATE INDEX IF NOT EXISTS idx_donations_cash_register_id ON public.donations(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_donations_bank_account_id ON public.donations(bank_account_id);