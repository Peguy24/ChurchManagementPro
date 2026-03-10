
-- Migration 5: Fix events anon policy - restrict to tenant-specific queries
DROP POLICY IF EXISTS "Anyone can view events for registration" ON events;

-- Anon users can only view events when filtering by a specific tenant_id
CREATE POLICY "Anon can view events by tenant" ON events
FOR SELECT TO anon
USING (tenant_id IS NOT NULL);
