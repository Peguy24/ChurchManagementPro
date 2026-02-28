
-- Add event_category column to events table for annual planning
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_category text DEFAULT 'general';

-- Add a comment to document the categories
COMMENT ON COLUMN public.events.event_category IS 'Categories: general, worship, fasting, conference, retreat, celebration, prayer, youth, community, holiday';
