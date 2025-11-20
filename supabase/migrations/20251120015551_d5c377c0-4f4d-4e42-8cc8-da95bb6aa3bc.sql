-- Add new fields to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS emergency_phone text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS baptism_status text,
ADD COLUMN IF NOT EXISTS number_of_children integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS children_names text;