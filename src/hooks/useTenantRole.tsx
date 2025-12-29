import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseTenantRoleReturn {
  isTenantAdmin: boolean;
  tenantRole: string | null;
  isApproved: boolean;
  loading: boolean;
  tenantId: string | null;
}

export function useTenantRole(): UseTenantRoleReturn {
  const { user } = useAuth();
  const [isTenantAdmin, setIsTenantAdmin] = useState(false);
  const [tenantRole, setTenantRole] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenantRole() {
      if (!user) {
        setIsTenantAdmin(false);
        setTenantRole(null);
        setIsApproved(false);
        setTenantId(null);
        setLoading(false);
        return;
      }

      try {
        // Get user's tenant from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (!profile?.tenant_id) {
          setIsTenantAdmin(false);
          setTenantRole(null);
          setIsApproved(false);
          setTenantId(null);
          setLoading(false);
          return;
        }

        setTenantId(profile.tenant_id);

        // Get user's role in this tenant
        const { data: roleData } = await supabase
          .from('tenant_user_roles')
          .select('role, is_approved')
          .eq('tenant_id', profile.tenant_id)
          .eq('user_id', user.id)
          .single();

        if (roleData) {
          setTenantRole(roleData.role);
          setIsApproved(roleData.is_approved);
          setIsTenantAdmin(roleData.role === 'admin' && roleData.is_approved);
        } else {
          setTenantRole(null);
          setIsApproved(false);
          setIsTenantAdmin(false);
        }
      } catch (err) {
        console.error('Error fetching tenant role:', err);
        setIsTenantAdmin(false);
        setTenantRole(null);
        setIsApproved(false);
      } finally {
        setLoading(false);
      }
    }

    fetchTenantRole();
  }, [user]);

  return {
    isTenantAdmin,
    tenantRole,
    isApproved,
    loading,
    tenantId,
  };
}
