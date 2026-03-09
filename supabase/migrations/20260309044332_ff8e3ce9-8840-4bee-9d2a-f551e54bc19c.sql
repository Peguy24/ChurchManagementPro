
-- Drop the broken SELECT policy that targets 'public' role
DROP POLICY IF EXISTS "Authenticated users can view custom fields" ON public.custom_fields;

-- Create a proper SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view custom fields"
  ON public.custom_fields
  FOR SELECT
  TO authenticated
  USING (true);

-- Also fix custom_field_values if needed
DROP POLICY IF EXISTS "Authenticated users can view custom field values" ON public.custom_field_values;

CREATE POLICY "Authenticated users can view custom field values"
  ON public.custom_field_values
  FOR SELECT
  TO authenticated
  USING (true);
