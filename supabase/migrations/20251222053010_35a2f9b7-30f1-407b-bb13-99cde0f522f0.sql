-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE CHECK (template_type IN ('birthday', 'event_reminder', 'attendance_alert')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins and pastors can manage email templates
CREATE POLICY "Admins and pastors can view email templates"
ON public.email_templates
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'pastor'));

CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default templates
INSERT INTO public.email_templates (template_type, subject, body_html) VALUES
('birthday', 'Joyeux Anniversaire {{member_name}}! 🎂', '<h1>Joyeux Anniversaire {{member_name}}!</h1><p>Toute l''église vous souhaite un merveilleux anniversaire!</p><p>Que cette nouvelle année de vie soit remplie de bénédictions.</p><p>Avec amour,<br>Votre église</p>'),
('event_reminder', 'Rappel: Culte de {{service_type}} - {{service_date}}', '<h1>Rappel de culte</h1><p>Cher(e) {{member_name}},</p><p>N''oubliez pas notre culte de <strong>{{service_type}}</strong> prévu le <strong>{{service_date}}</strong>.</p><p>Nous espérons vous voir!</p><p>Votre église</p>'),
('attendance_alert', 'Nous vous manquez! 💙', '<h1>Cher(e) {{member_name}},</h1><p>Nous avons remarqué que vous n''avez pas pu assister aux derniers cultes.</p><p>Votre présence nous manque! Si vous traversez une période difficile ou si vous avez besoin de soutien, n''hésitez pas à nous contacter.</p><p>Avec amour,<br>Votre église</p>');