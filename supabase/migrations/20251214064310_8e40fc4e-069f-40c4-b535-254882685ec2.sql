-- Add missing fields to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS origin_church text,
ADD COLUMN IF NOT EXISTS join_date date,
ADD COLUMN IF NOT EXISTS member_number text UNIQUE;

-- Create a function to auto-generate member numbers
CREATE OR REPLACE FUNCTION public.generate_member_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 4) AS INTEGER)), 0) + 1 
  INTO next_num 
  FROM public.members 
  WHERE member_number IS NOT NULL AND member_number LIKE 'MBR%';
  
  -- Format as MBR followed by 5 digits (e.g., MBR00001)
  NEW.member_number := 'MBR' || LPAD(next_num::text, 5, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate member number on insert
DROP TRIGGER IF EXISTS trigger_generate_member_number ON public.members;
CREATE TRIGGER trigger_generate_member_number
  BEFORE INSERT ON public.members
  FOR EACH ROW
  WHEN (NEW.member_number IS NULL)
  EXECUTE FUNCTION public.generate_member_number();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_member_number ON public.members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_gender ON public.members(gender);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON public.members(join_date);