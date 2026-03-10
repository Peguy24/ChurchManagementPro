
-- Drop the old unique constraint that doesn't account for tenant_id
ALTER TABLE public.role_permissions DROP CONSTRAINT role_permissions_role_permission_group_key;

-- Add a new unique constraint that includes tenant_id using COALESCE to handle NULLs
CREATE UNIQUE INDEX role_permissions_role_permission_group_tenant_idx 
ON public.role_permissions (role, permission_group, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'));
