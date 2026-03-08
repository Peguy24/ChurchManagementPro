
-- Add tenant_id column to financial_audit_logs
ALTER TABLE public.financial_audit_logs ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Backfill tenant_id from new_values JSON
UPDATE public.financial_audit_logs
SET tenant_id = (new_values->>'tenant_id')::uuid
WHERE tenant_id IS NULL AND new_values->>'tenant_id' IS NOT NULL;

-- Backfill from old_values for delete actions
UPDATE public.financial_audit_logs
SET tenant_id = (old_values->>'tenant_id')::uuid
WHERE tenant_id IS NULL AND old_values->>'tenant_id' IS NOT NULL;

-- Create index for tenant filtering
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_tenant ON public.financial_audit_logs(tenant_id);

-- Update the trigger function to also store tenant_id
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_email_val text;
  record_tenant_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  SELECT email INTO user_email_val
  FROM auth.users
  WHERE id = current_user_id;

  -- Extract tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    record_tenant_id := (to_jsonb(OLD)->>'tenant_id')::uuid;
  ELSE
    record_tenant_id := (to_jsonb(NEW)->>'tenant_id')::uuid;
  END IF;
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, new_values, user_id, user_email, tenant_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', to_jsonb(NEW), current_user_id, user_email_val, record_tenant_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, new_values, user_id, user_email, tenant_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), current_user_id, user_email_val, record_tenant_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.financial_audit_logs (entity_type, entity_id, action, old_values, user_id, user_email, tenant_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), current_user_id, user_email_val, record_tenant_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;
