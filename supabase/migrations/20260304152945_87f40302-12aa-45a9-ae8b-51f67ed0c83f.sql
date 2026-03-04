
-- Remove duplicate attendance records, keeping the earliest one
DELETE FROM public.attendance_records a
USING public.attendance_records b
WHERE a.id > b.id
  AND a.member_id = b.member_id
  AND a.event_date = b.event_date
  AND a.event_id IS NOT DISTINCT FROM b.event_id;

-- Now add unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_member_event_date 
ON public.attendance_records (member_id, event_date, event_id) 
WHERE event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique_member_date_no_event 
ON public.attendance_records (member_id, event_date) 
WHERE event_id IS NULL;
