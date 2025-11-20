-- Create enum for custom field types
CREATE TYPE public.custom_field_type AS ENUM (
  'text',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox'
);

-- Create enum for entity types
CREATE TYPE public.entity_type AS ENUM (
  'member',
  'branch',
  'ministry',
  'event',
  'donation'
);

-- Create custom_fields table to store field definitions
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type custom_field_type NOT NULL,
  field_options JSONB, -- For select options: {"options": ["Option 1", "Option 2"]}
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_type, field_name)
);

-- Create custom_field_values table to store actual values
CREATE TABLE public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_field_id UUID REFERENCES public.custom_fields(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID NOT NULL,
  field_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(custom_field_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_fields (admins can manage, everyone can view)
CREATE POLICY "Admins can manage custom fields"
ON public.custom_fields
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view custom fields"
ON public.custom_fields
FOR SELECT
USING (true);

-- RLS policies for custom_field_values (authenticated users can manage their data)
CREATE POLICY "Authenticated users can manage custom field values"
ON public.custom_field_values
FOR ALL
USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_custom_fields_updated_at
BEFORE UPDATE ON public.custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_custom_field_values_updated_at
BEFORE UPDATE ON public.custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_custom_fields_entity_type ON public.custom_fields(entity_type);
CREATE INDEX idx_custom_fields_active ON public.custom_fields(is_active);
CREATE INDEX idx_custom_field_values_entity_id ON public.custom_field_values(entity_id);
CREATE INDEX idx_custom_field_values_custom_field_id ON public.custom_field_values(custom_field_id);