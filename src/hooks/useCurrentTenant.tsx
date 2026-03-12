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
  // Helper to inject tenant_id into any object
  withTenantId: <T extends object>(data: T) => T & { tenant_id: string | null };
  // Helper to create insert data with tenant_id
  forInsert: <T extends object>(data: T) => T & { tenant_id: string };
  // Check if user has a tenant
  hasTenant: boolean;
  // Refresh tenant info
  refresh: () => Promise<void>;
}

const TENANT_CACHE_KEY = 'tenant_cache';

function loadCachedTenant(userId: string): { tenantId: string; tenant: TenantInfo } | null {
  try {
    const raw = sessionStorage.getItem(TENANT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.userId === userId) return { tenantId: parsed.tenantId, tenant: parsed.tenant };
  } catch {}
  return null;
}

function saveCachedTenant(userId: string, tenantId: string, tenant: TenantInfo) {
  try {
    sessionStorage.setItem(TENANT_CACHE_KEY, JSON.stringify({ userId, tenantId, tenant }));
  } catch {}
}

export function useCurrentTenant(): UseCurrentTenantReturn {
  const { user } = useAuth();

  // Try cached userId from sessionStorage even before auth resolves
  const [cachedUserId] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem(TENANT_CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).userId ?? null;
    } catch { return null; }
  });
  
  // Initialize from sessionStorage for instant render
  const [tenantId, setTenantId] = useState<string | null>(() => {
    const uid = user?.id ?? cachedUserId;
    if (!uid) return null;
    return loadCachedTenant(uid)?.tenantId ?? null;
  });
  const [tenant, setTenant] = useState<TenantInfo | null>(() => {
    const uid = user?.id ?? cachedUserId;
    if (!uid) return null;
    return loadCachedTenant(uid)?.tenant ?? null;
  });
  const [loading, setLoading] = useState(() => {
    const uid = user?.id ?? cachedUserId;
    if (!uid) return false;
    return !loadCachedTenant(uid);
  });
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const cachedTenantRef = useRef<{ tenantId: string; tenant: TenantInfo } | null>(null);

  const fetchTenantInfo = useCallback(async () => {
    if (!user) {
      setTenantId(null);
      setTenant(null);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Skip if same user and we already have cached data in memory
    if (lastUserIdRef.current === user.id && cachedTenantRef.current) {
      setTenantId(cachedTenantRef.current.tenantId);
      setTenant(cachedTenantRef.current.tenant);
      setLoading(false);
      return;
    }

    // Only show loading if we have no cached data at all
    const sessionCached = loadCachedTenant(user.id);
    if (!sessionCached) {
      setLoading(true);
    }
    setError(null);

    try {
      // Get user's tenant_id from profile
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

      // Get full tenant info
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
      cachedTenantRef.current = { tenantId: profile.tenant_id, tenant: tenantData };
      saveCachedTenant(user.id, profile.tenant_id, tenantData);
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTenantInfo();
  }, [fetchTenantInfo]);

  // Helper to add tenant_id to any object
  const withTenantId = useCallback(<T extends object>(data: T): T & { tenant_id: string | null } => {
    return {
      ...data,
      tenant_id: tenantId,
    };
  }, [tenantId]);

  // Helper specifically for inserts - throws if no tenant
  const forInsert = useCallback(<T extends object>(data: T): T & { tenant_id: string } => {
    if (!tenantId) {
      throw new Error('Aucun tenant associé à cet utilisateur. Impossible de créer des données.');
    }
    return {
      ...data,
      tenant_id: tenantId,
    };
  }, [tenantId]);

  return {
    tenantId,
    tenant,
    loading,
    error,
    withTenantId,
    forInsert,
    hasTenant: !!tenantId,
    refresh: fetchTenantInfo,
  };
}

// Type helper for forms that need tenant_id
export type WithTenantId<T> = T & { tenant_id: string };

// Utility function to use outside of React components
export async function getCurrentUserTenantId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single();
  
  return data?.tenant_id || null;
}
