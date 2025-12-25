-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  location TEXT,
  branch_id UUID REFERENCES public.branches(id),
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'cancelled', 'completed')),
  expected_attendees INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Staff can view events" 
ON public.events 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'secretary'::app_role) OR 
  has_role(auth.uid(), 'treasurer'::app_role) OR 
  has_role(auth.uid(), 'volunteer'::app_role)
);

CREATE POLICY "Staff can insert events" 
ON public.events 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Staff can update events" 
ON public.events 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'secretary'::app_role)
);

CREATE POLICY "Admins can delete events" 
ON public.events 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();