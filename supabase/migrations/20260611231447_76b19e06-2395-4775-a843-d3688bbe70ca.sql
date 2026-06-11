
-- ============================================================
-- 1) Credit operations & payments: restrict to financial roles
-- ============================================================
DROP POLICY IF EXISTS "Users can view credit operations of their tenant" ON public.credit_operations;
DROP POLICY IF EXISTS "Users can insert credit operations for their tenant" ON public.credit_operations;
DROP POLICY IF EXISTS "Users can update credit operations of their tenant" ON public.credit_operations;
DROP POLICY IF EXISTS "Users can delete credit operations of their tenant" ON public.credit_operations;

CREATE POLICY "Financial roles can view credit operations"
  ON public.credit_operations FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

CREATE POLICY "Financial roles can insert credit operations"
  ON public.credit_operations FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

CREATE POLICY "Financial roles can update credit operations"
  ON public.credit_operations FOR UPDATE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

CREATE POLICY "Financial roles can delete credit operations"
  ON public.credit_operations FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

DROP POLICY IF EXISTS "Users can view credit payments of their tenant" ON public.credit_payments;
DROP POLICY IF EXISTS "Users can insert credit payments for their tenant" ON public.credit_payments;
DROP POLICY IF EXISTS "Users can delete credit payments of their tenant" ON public.credit_payments;

CREATE POLICY "Financial roles can view credit payments"
  ON public.credit_payments FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

CREATE POLICY "Financial roles can insert credit payments"
  ON public.credit_payments FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

CREATE POLICY "Financial roles can delete credit payments"
  ON public.credit_payments FOR DELETE TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'treasurer'::app_role)
    )
  );

-- ============================================================
-- 2) data_cleanup_logs: restrict reads to tenant admins
-- ============================================================
DROP POLICY IF EXISTS "Tenant admins can read cleanup logs" ON public.data_cleanup_logs;

CREATE POLICY "Tenant admins can read cleanup logs"
  ON public.data_cleanup_logs FOR SELECT TO authenticated
  USING (
    tenant_id = get_user_tenant_id(auth.uid())
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR is_tenant_admin(auth.uid())
    )
  );

-- ============================================================
-- 3) inventory_usage: add tenant_id column + direct RLS
-- ============================================================
ALTER TABLE public.inventory_usage ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.inventory_usage u
SET tenant_id = i.tenant_id
FROM public.inventory_items i
WHERE u.item_id = i.id AND u.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_usage_tenant_id ON public.inventory_usage(tenant_id);

-- Backfill trigger so tenant_id is always set from the parent item
CREATE OR REPLACE FUNCTION public.set_inventory_usage_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.item_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.inventory_items WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_inventory_usage_tenant_id ON public.inventory_usage;
CREATE TRIGGER trg_set_inventory_usage_tenant_id
  BEFORE INSERT OR UPDATE ON public.inventory_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_inventory_usage_tenant_id();

-- ============================================================
-- 4) member_documents: add tenant_id column + backfill trigger
-- ============================================================
ALTER TABLE public.member_documents ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE public.member_documents d
SET tenant_id = m.tenant_id
FROM public.members m
WHERE d.member_id = m.id AND d.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_documents_tenant_id ON public.member_documents(tenant_id);

CREATE OR REPLACE FUNCTION public.set_member_documents_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.member_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.members WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_member_documents_tenant_id ON public.member_documents;
CREATE TRIGGER trg_set_member_documents_tenant_id
  BEFORE INSERT OR UPDATE ON public.member_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_member_documents_tenant_id();

-- ============================================================
-- 5) Remove sensitive tables from Realtime publication to prevent
--    unauthenticated channel subscribers from receiving row events.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='client_reviews'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.client_reviews';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='platform_notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.platform_notifications';
  END IF;
END $$;
