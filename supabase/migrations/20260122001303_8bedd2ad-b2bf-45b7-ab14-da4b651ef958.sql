-- Allow anyone (including unauthenticated users) to view tenant basic info by slug
-- This is needed for the tenant auth page to display church name and logo
CREATE POLICY "Anyone can view tenants by slug" 
ON public.tenants 
FOR SELECT 
USING (true);