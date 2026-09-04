CREATE INDEX IF NOT EXISTS idx_policy_acceptances_tenant_doc
  ON public.tenant_policy_acceptances (tenant_id, document_type, document_version DESC);

CREATE OR REPLACE FUNCTION public.get_tenant_policy_status(_tenant_id uuid)
RETURNS TABLE (
  document_type text,
  current_version integer,
  accepted_version integer,
  accepted_at timestamptz,
  accepted_by_name text,
  needs_acceptance boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.document_type,
    d.version AS current_version,
    a.document_version AS accepted_version,
    a.accepted_at,
    a.accepted_by_name,
    (a.document_version IS NULL OR a.document_version < d.version) AS needs_acceptance
  FROM public.legal_documents d
  LEFT JOIN LATERAL (
    SELECT ta.document_version, ta.accepted_at, ta.accepted_by_name
    FROM public.tenant_policy_acceptances ta
    WHERE ta.tenant_id = _tenant_id
      AND ta.document_type = d.document_type
    ORDER BY ta.document_version DESC, ta.accepted_at DESC
    LIMIT 1
  ) a ON true
  WHERE
    _tenant_id IS NOT NULL
    AND (
      public.is_super_admin(auth.uid())
      OR _tenant_id = public.get_user_tenant_id(auth.uid())
    )
  ORDER BY d.document_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_policy_status(uuid) TO authenticated;