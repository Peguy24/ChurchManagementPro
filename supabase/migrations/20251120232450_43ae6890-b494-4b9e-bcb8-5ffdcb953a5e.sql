-- Create branches table for organizational hierarchy
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES public.members(id),
  parent_branch_id UUID REFERENCES public.branches(id),
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create policies for branches
CREATE POLICY "Authenticated users can view branches"
ON public.branches
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert branches"
ON public.branches
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update branches"
ON public.branches
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete branches"
ON public.branches
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add branch_id to members table
ALTER TABLE public.members ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- Add branch_id to ministries table
ALTER TABLE public.ministries ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- Add branch_id to attendance_records table
ALTER TABLE public.attendance_records ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- Create index for better performance
CREATE INDEX idx_members_branch_id ON public.members(branch_id);
CREATE INDEX idx_ministries_branch_id ON public.ministries(branch_id);
CREATE INDEX idx_attendance_branch_id ON public.attendance_records(branch_id);