CREATE OR REPLACE FUNCTION public.validate_event_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_date date := (CURRENT_DATE - INTERVAL '5 years')::date;
  max_date date := (CURRENT_DATE + INTERVAL '5 years')::date;
  max_duration_days int := 366;
BEGIN
  IF NEW.event_date IS NULL THEN
    RAISE EXCEPTION 'event_date is required' USING ERRCODE = '23502';
  END IF;

  IF NEW.event_date < min_date OR NEW.event_date > max_date THEN
    RAISE EXCEPTION 'event_date must be within 5 years of today (got %)', NEW.event_date
      USING ERRCODE = '22008';
  END IF;

  IF NEW.end_date IS NOT NULL THEN
    IF NEW.end_date < min_date OR NEW.end_date > max_date THEN
      RAISE EXCEPTION 'end_date must be within 5 years of today (got %)', NEW.end_date
        USING ERRCODE = '22008';
    END IF;
    IF NEW.end_date < NEW.event_date THEN
      RAISE EXCEPTION 'end_date cannot be before event_date'
        USING ERRCODE = '22008';
    END IF;
    IF (NEW.end_date - NEW.event_date) > max_duration_days THEN
      RAISE EXCEPTION 'event duration cannot exceed % days (got % days)', max_duration_days, (NEW.end_date - NEW.event_date)
        USING ERRCODE = '22008';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;