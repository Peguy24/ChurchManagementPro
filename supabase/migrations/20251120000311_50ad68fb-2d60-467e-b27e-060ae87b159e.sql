-- Add new fields to members table
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS marital_status TEXT,
ADD COLUMN IF NOT EXISTS civic_status TEXT,
ADD COLUMN IF NOT EXISTS conversion_date DATE,
ADD COLUMN IF NOT EXISTS baptism_date DATE,
ADD COLUMN IF NOT EXISTS academic_formation TEXT,
ADD COLUMN IF NOT EXISTS professional_formation TEXT,
ADD COLUMN IF NOT EXISTS christian_experience TEXT,
ADD COLUMN IF NOT EXISTS marriage_date DATE,
ADD COLUMN IF NOT EXISTS spouse_name TEXT;