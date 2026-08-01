
CREATE OR REPLACE FUNCTION public.is_approved_tenant_user(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL OR _tenant_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_user_roles tur
      WHERE tur.user_id = _user_id
        AND tur.tenant_id = _tenant_id
        AND tur.is_approved = true
        AND tur.role <> 'user'::app_role
    )
  END;
$$;

DROP POLICY IF EXISTS "Tenant users can view members" ON public.members;
CREATE POLICY "Approved tenant staff can view members"
ON public.members FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_approved_tenant_user(auth.uid(), tenant_id)
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
      OR branch_id IS NOT DISTINCT FROM public.get_user_branch_id(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Tenant users can view visitors" ON public.visitors;
CREATE POLICY "Approved tenant staff can view visitors"
ON public.visitors FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'pastor'::app_role)
      OR public.has_tenant_role(auth.uid(), tenant_id, 'secretary'::app_role)
    )
  )
);

CREATE OR REPLACE FUNCTION public.get_public_join_config(_slug text)
RETURNS TABLE(tenant_id uuid, tenant_name text, logo_url text, primary_color text, ministries jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.name,
    COALESCE(
      NULLIF(btrim(t.logo_url), ''),
      NULLIF(btrim((SELECT cs.setting_value FROM public.church_settings cs
                     WHERE cs.tenant_id = t.id AND cs.setting_key IN ('church_logo_url','church_logo')
                       AND cs.setting_value IS NOT NULL AND btrim(cs.setting_value) <> ''
                     LIMIT 1)), '')
    ),
    t.primary_color,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name) ORDER BY m.name)
      FROM public.ministries m
      WHERE m.tenant_id = t.id AND m.status = 'active'
    ), '[]'::jsonb)
  FROM public.tenants t
  WHERE t.slug = _slug
     OR (_slug ~ '^[0-9a-fA-F-]{36}$' AND t.id = _slug::uuid)
  LIMIT 1
$$;
