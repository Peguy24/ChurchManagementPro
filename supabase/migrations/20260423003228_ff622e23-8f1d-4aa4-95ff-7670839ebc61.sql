-- Server-side validation of custom field values per declared type.
-- Mirrors client-side rules so bypassed clients cannot save mismatched data.
CREATE OR REPLACE FUNCTION public.validate_custom_field_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f_type text;
  f_required boolean;
  f_options jsonb;
  v text;
BEGIN
  SELECT field_type::text, is_required, field_options
  INTO f_type, f_required, f_options
  FROM public.custom_fields
  WHERE id = NEW.custom_field_id;

  IF f_type IS NULL THEN
    RAISE EXCEPTION 'custom field % not found', NEW.custom_field_id USING ERRCODE = '23503';
  END IF;

  v := COALESCE(NEW.field_value, '');

  -- Empty value: allowed unless required
  IF length(btrim(v)) = 0 THEN
    IF COALESCE(f_required, false) THEN
      RAISE EXCEPTION 'custom field % is required', NEW.custom_field_id USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF f_type = 'text' THEN
    IF length(v) > 255 THEN
      RAISE EXCEPTION 'text custom field exceeds 255 characters' USING ERRCODE = '22001';
    END IF;

  ELSIF f_type = 'textarea' THEN
    IF length(v) > 2000 THEN
      RAISE EXCEPTION 'textarea custom field exceeds 2000 characters' USING ERRCODE = '22001';
    END IF;

  ELSIF f_type = 'number' THEN
    IF v !~ '^-?\d+(\.\d+)?$' THEN
      RAISE EXCEPTION 'custom field value must be a valid number' USING ERRCODE = '22P02';
    END IF;

  ELSIF f_type = 'date' THEN
    BEGIN
      PERFORM v::date;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'custom field value must be a valid date' USING ERRCODE = '22007';
    END;

  ELSIF f_type = 'select' THEN
    IF f_options IS NOT NULL
       AND jsonb_typeof(f_options->'options') = 'array'
       AND jsonb_array_length(f_options->'options') > 0
       AND NOT (f_options->'options' ? v) THEN
      RAISE EXCEPTION 'custom field value must be one of the allowed options' USING ERRCODE = '23514';
    END IF;

  ELSIF f_type = 'checkbox' THEN
    IF v NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'checkbox custom field must be true or false' USING ERRCODE = '22P02';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_custom_field_value_trg ON public.custom_field_values;
CREATE TRIGGER validate_custom_field_value_trg
BEFORE INSERT OR UPDATE ON public.custom_field_values
FOR EACH ROW EXECUTE FUNCTION public.validate_custom_field_value();