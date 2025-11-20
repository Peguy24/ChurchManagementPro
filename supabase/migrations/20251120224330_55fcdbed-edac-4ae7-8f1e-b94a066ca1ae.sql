-- Create ministries table
CREATE TABLE public.ministries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ministry_members junction table for many-to-many relationship
CREATE TABLE public.ministry_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ministry_id, member_id)
);

-- Enable Row Level Security
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ministries
CREATE POLICY "Authenticated users can view ministries"
  ON public.ministries FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert ministries"
  ON public.ministries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ministries"
  ON public.ministries FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete ministries"
  ON public.ministries FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ministry_members
CREATE POLICY "Authenticated users can view ministry members"
  ON public.ministry_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert ministry members"
  ON public.ministry_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ministry members"
  ON public.ministry_members FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete ministry members"
  ON public.ministry_members FOR DELETE
  USING (true);

-- Add trigger for automatic timestamp updates on ministries
CREATE TRIGGER update_ministries_updated_at
  BEFORE UPDATE ON public.ministries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();