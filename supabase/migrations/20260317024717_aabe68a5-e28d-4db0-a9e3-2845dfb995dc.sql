-- Storage quota tracking function
CREATE OR REPLACE FUNCTION public.get_tenant_storage_usage(_tenant_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  total_bytes bigint;
BEGIN
  SELECT COALESCE(SUM((o.metadata->>'size')::bigint), 0)
  INTO total_bytes
  FROM storage.objects o
  WHERE o.bucket_id IN ('member-photos', 'member-documents', 'inventory-photos', 'tenant-logos')
    AND o.name LIKE _tenant_id::text || '/%';
  
  RETURN total_bytes;
END;
$$;

-- Convenience function: returns usage in MB
CREATE OR REPLACE FUNCTION public.get_tenant_storage_mb(_tenant_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ROUND(public.get_tenant_storage_usage(_tenant_id)::numeric / (1024 * 1024), 2);
$$;