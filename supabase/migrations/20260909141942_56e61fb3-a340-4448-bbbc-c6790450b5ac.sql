
-- 1) Replace legacy global admin bypass with platform-owner (super admin) check in all public policies
DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%has_role(auth.uid(), ''admin''::app_role)%'
        OR with_check LIKE '%has_role(auth.uid(), ''admin''::app_role)%')
  LOOP
    new_qual := replace(coalesce(r.qual, ''), 'has_role(auth.uid(), ''admin''::app_role)', 'is_super_admin(auth.uid())');
    new_check := replace(coalesce(r.with_check, ''), 'has_role(auth.uid(), ''admin''::app_role)', 'is_super_admin(auth.uid())');

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);

    stmt := format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO %s',
                   r.policyname, r.tablename, r.cmd, array_to_string(r.roles, ', '));
    IF r.qual IS NOT NULL THEN
      stmt := stmt || format(' USING (%s)', new_qual);
    END IF;
    IF r.with_check IS NOT NULL THEN
      stmt := stmt || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE stmt;
  END LOOP;
END $$;

-- 2) Enforce tenant ownership on tables that currently have no orphaned rows
ALTER TABLE public.donations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bank_accounts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.visitors ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.special_funds ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.budgets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.service_roles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.volunteer_schedules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.member_documents ALTER COLUMN tenant_id SET NOT NULL;
