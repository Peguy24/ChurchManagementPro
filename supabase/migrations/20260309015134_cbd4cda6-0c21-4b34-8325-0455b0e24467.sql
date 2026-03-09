
-- Create tenant notifications table for church admin in-app notifications
CREATE TABLE public.tenant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'info',
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: tenant admins can read their own tenant's notifications
CREATE POLICY "Tenant users can view own notifications"
ON public.tenant_notifications FOR SELECT TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: tenant admins can update (mark read/dismiss) their own notifications
CREATE POLICY "Tenant users can update own notifications"
ON public.tenant_notifications FOR UPDATE TO authenticated
USING (tenant_id = get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Policy: super admins and system can insert notifications
CREATE POLICY "Super admins can insert notifications"
ON public.tenant_notifications FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- Policy: system/edge functions can insert via service role (no policy needed, service role bypasses RLS)

-- Create index for fast lookups
CREATE INDEX idx_tenant_notifications_tenant_id ON public.tenant_notifications(tenant_id);
CREATE INDEX idx_tenant_notifications_dismissed ON public.tenant_notifications(tenant_id, is_dismissed);

-- Auto-generate notifications on key events via trigger
-- New member added → notification
CREATE OR REPLACE FUNCTION public.notify_tenant_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_notifications (tenant_id, notification_type, severity, title, message, metadata)
    VALUES (
      NEW.tenant_id,
      'new_member',
      'info',
      'Nouveau membre ajouté',
      NEW.first_name || ' ' || NEW.last_name || ' a été ajouté comme membre.',
      jsonb_build_object('member_id', NEW.id, 'member_name', NEW.first_name || ' ' || NEW.last_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_member
AFTER INSERT ON public.members
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_new_member();

-- New donation → notification
CREATE OR REPLACE FUNCTION public.notify_tenant_new_donation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_notifications (tenant_id, notification_type, severity, title, message, metadata)
    VALUES (
      NEW.tenant_id,
      'new_donation',
      'info',
      'Nouveau don reçu',
      'Un don de ' || NEW.amount || ' a été enregistré.',
      jsonb_build_object('donation_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_donation
AFTER INSERT ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_new_donation();

-- New event created → notification
CREATE OR REPLACE FUNCTION public.notify_tenant_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_notifications (tenant_id, notification_type, severity, title, message, metadata)
    VALUES (
      NEW.tenant_id,
      'new_event',
      'info',
      'Nouvel événement créé',
      'L''événement "' || NEW.name || '" a été créé pour le ' || NEW.event_date || '.',
      jsonb_build_object('event_id', NEW.id, 'event_name', NEW.name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_event
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_new_event();

-- New expense → notification
CREATE OR REPLACE FUNCTION public.notify_tenant_new_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL THEN
    INSERT INTO public.tenant_notifications (tenant_id, notification_type, severity, title, message, metadata)
    VALUES (
      NEW.tenant_id,
      'new_expense',
      'warning',
      'Nouvelle dépense enregistrée',
      'Dépense de ' || NEW.amount || ' - ' || NEW.description,
      jsonb_build_object('expense_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_new_expense
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_new_expense();

-- Member request → notification
CREATE OR REPLACE FUNCTION public.notify_tenant_member_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tenant_notifications (tenant_id, notification_type, severity, title, message, metadata)
  VALUES (
    NEW.tenant_id,
    'member_request',
    'warning',
    'Nouvelle demande d''adhésion',
    NEW.first_name || ' ' || NEW.last_name || ' souhaite rejoindre votre église.',
    jsonb_build_object('request_id', NEW.id, 'name', NEW.first_name || ' ' || NEW.last_name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_member_request
AFTER INSERT ON public.member_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_tenant_member_request();
