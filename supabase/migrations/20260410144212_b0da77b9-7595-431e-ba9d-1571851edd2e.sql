-- Remove the weaker duplicate INSERT policy that doesn't validate event-tenant relationship
DROP POLICY IF EXISTS "Anyone can register for events with valid data" ON public.event_registrations;