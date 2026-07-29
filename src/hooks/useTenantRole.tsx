import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';

interface UseTenantRoleReturn {
  isTenantAdmin: boolean;
  tenantRole: string | null;
  isApproved: boolean;
  loading: boolean;
  tenantId: string | null;
}

export function useTenantRole(): UseTenantRoleReturn {
  const { roles, isAdmin, isApproved, loading: roleLoading } = useUserRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const tenantRole = roles.find((role) => role !== 'admin') ?? (tenantId && isAdmin ? 'admin' : null);

  return {
    isTenantAdmin: isAdmin && isApproved && !!tenantId,
    tenantRole,
    isApproved,
    loading: roleLoading || tenantLoading,
    tenantId,
  };
}
