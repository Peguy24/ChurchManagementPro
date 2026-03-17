
-- Update trigger functions to store neutral keys instead of French text

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
      'new_member_added',
      'member:' || NEW.first_name || ' ' || NEW.last_name,
      jsonb_build_object('member_id', NEW.id, 'member_name', NEW.first_name || ' ' || NEW.last_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

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
      'new_donation_received',
      'amount:' || NEW.amount,
      jsonb_build_object('donation_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;

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
      'new_event_created',
      'event:' || NEW.name || '|date:' || NEW.event_date,
      jsonb_build_object('event_id', NEW.id, 'event_name', NEW.name, 'event_date', NEW.event_date)
    );
  END IF;
  RETURN NEW;
END;
$$;

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
      'new_expense_recorded',
      'amount:' || NEW.amount || '|desc:' || NEW.description,
      jsonb_build_object('expense_id', NEW.id, 'amount', NEW.amount, 'description', NEW.description)
    );
  END IF;
  RETURN NEW;
END;
$$;

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
    'new_membership_request',
    'member:' || NEW.first_name || ' ' || NEW.last_name,
    jsonb_build_object('request_id', NEW.id, 'name', NEW.first_name || ' ' || NEW.last_name)
  );
  RETURN NEW;
END;
$$;
