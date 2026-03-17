import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface UseCurrentTenantReturn {
  tenantId: string | null;
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  withTenantId: <T extends object>(data: T) => T & { tenant_id: string | null };
  forInsert: <T extends object>(data: T) => T & { tenant_id: string };
  hasTenant: boolean;
  refresh: () => Promise<void>;
}

const TENANT_CACHE_KEY = 'tenant_cache';

function loadCachedTenant(): { userId: string; tenantId: string; tenant: TenantInfo } | null {
  try {
    const raw = sessionStorage.getItem(TENANT_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Load partial tenant_id cache set by useUserRole to skip duplicate profiles query
function loadCachedTenantId(): { userId: string; tenantId: string } | null {
  try {
    const raw = sessionStorage.getItem('tenant_cache_tenant_id');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCachedTenant(userId: string, tenantId: string, tenant: TenantInfo) {
  try {
    sessionStorage.setItem(TENANT_CACHE_KEY, JSON.stringify({ userId, tenantId, tenant }));
  } catch {}
}

// Read cache once at module level to avoid repeated sessionStorage access
const initialCache = loadCachedTenant();

export function useCurrentTenant(): UseCurrentTenantReturn {
  const { user } = useAuth();

  const [tenantId, setTenantId] = useState<string | null>(initialCache?.tenantId ?? null);
  const [tenant, setTenant] = useState<TenantInfo | null>(initialCache?.tenant ?? null);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchTenantInfo = useCallback(async () => {
    if (!user) {
      setTenantId(null);
      setTenant(null);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    if (lastUserIdRef.current === user.id) {
      return;
    }

    // Check if cache matches current user
    const cached = loadCachedTenant();
    if (cached && cached.userId === user.id) {
      setTenantId(cached.tenantId);
      setTenant(cached.tenant);
      setLoading(false);
      lastUserIdRef.current = user.id;
      // Still refresh in background
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error('Impossible de récupérer le profil utilisateur');
      }

      if (!profile?.tenant_id) {
        setTenantId(null);
        setTenant(null);
        lastUserIdRef.current = user.id;
        setLoading(false);
        return;
      }

      setTenantId(profile.tenant_id);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) {
        throw new Error('Impossible de récupérer les informations du tenant');
      }

      setTenant(tenantData);
      lastUserIdRef.current = user.id;
      saveCachedTenant(user.id, profile.tenant_id, tenantData);
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const forceRefresh = useCallback(async () => {
    lastUserIdRef.current = null;
    await fetchTenantInfo();
  }, [fetchTenantInfo]);

  useEffect(() => {
    fetchTenantInfo();
  }, [fetchTenantInfo]);

  const withTenantId = useCallback(<T extends object>(data: T): T & { tenant_id: string | null } => {
    return { ...data, tenant_id: tenantId };
  }, [tenantId]);

  const forInsert = useCallback(<T extends object>(data: T): T & { tenant_id: string } => {
    if (!tenantId) {
      throw new Error('Aucun tenant associé à cet utilisateur. Impossible de créer des données.');
    }
    return { ...data, tenant_id: tenantId };
  }, [tenantId]);

  // If we have cached data, don't report loading
  const effectiveLoading = (tenantId || tenant) ? false : loading;

  return {
    tenantId,
    tenant,
    loading: effectiveLoading,
    error,
    withTenantId,
    forInsert,
    hasTenant: !!tenantId,
    refresh: forceRefresh,
  };
}

export type WithTenantId<T> = T & { tenant_id: string };

export async function getCurrentUserTenantId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();
  
  return data?.tenant_id || null;
}
