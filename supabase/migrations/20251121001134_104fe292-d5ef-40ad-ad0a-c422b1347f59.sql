-- Create donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  donation_type TEXT NOT NULL DEFAULT 'offering',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add comment on table
COMMENT ON TABLE public.donations IS 'Stores all financial donations and contributions';

-- Add comments on columns
COMMENT ON COLUMN public.donations.donation_type IS 'Types: tithe, offering, mission, building, special';
COMMENT ON COLUMN public.donations.payment_method IS 'Methods: cash, check, transfer, card';

-- Create index for performance
CREATE INDEX idx_donations_member_id ON public.donations(member_id);
CREATE INDEX idx_donations_branch_id ON public.donations(branch_id);
CREATE INDEX idx_donations_donation_date ON public.donations(donation_date);
CREATE INDEX idx_donations_donation_type ON public.donations(donation_type);

-- Enable Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view donations"
  ON public.donations
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert donations"
  ON public.donations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update donations"
  ON public.donations
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete donations"
  ON public.donations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();