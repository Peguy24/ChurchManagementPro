-- Create church settings table for organization info
CREATE TABLE public.church_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.church_settings ENABLE ROW LEVEL SECURITY;

-- Staff can view settings
CREATE POLICY "Staff can view church settings"
ON public.church_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'pastor'::app_role) OR 
  has_role(auth.uid(), 'treasurer'::app_role) OR
  has_role(auth.uid(), 'secretary'::app_role)
);

-- Only admins can manage settings
CREATE POLICY "Admins can insert church settings"
ON public.church_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update church settings"
ON public.church_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete church settings"
ON public.church_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_church_settings_updated_at
BEFORE UPDATE ON public.church_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default settings
INSERT INTO public.church_settings (setting_key, setting_value) VALUES
  ('church_name', 'Nom de votre église'),
  ('church_address', 'Adresse de l''église'),
  ('church_phone', '+509 XXXX-XXXX'),
  ('church_email', 'contact@eglise.org'),
  ('church_tax_id', ''),
  ('church_logo_url', ''),
  ('fiscal_receipt_footer', 'Ce document est un reçu officiel pour fins fiscales.');