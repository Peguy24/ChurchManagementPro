-- Add event_id column to attendance_records to link with events
ALTER TABLE public.attendance_records 
ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_attendance_records_event_id ON public.attendance_records(event_id);