import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { readImpersonation } from '@/hooks/useImpersonation';


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

export function useCurrentTenant(): UseCurrentTenantReturn {
  const { user, loading: authLoading } = useAuth();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchTenantInfo = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setTenantId(null);
      setTenant(null);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Impersonation override: if a super admin has an active session, load that tenant
    const imp = readImpersonation();
    if (imp && imp.superAdminId === user.id) {
      if (lastUserIdRef.current === `imp:${imp.tenantId}`) return;
      try {
        const { data: tenantData, error: tErr } = await supabase
          .from('tenants')
          .select('id, name, slug, logo_url, primary_color')
          .eq('id', imp.tenantId)
          .single();
        if (tErr) throw tErr;
        setTenantId(imp.tenantId);
        setTenant(tenantData);
        lastUserIdRef.current = `imp:${imp.tenantId}`;
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Impersonation tenant fetch failed:', err);
      }
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
      // First check if useUserRole already resolved tenant_id (avoids duplicate profiles query)
      const cachedTenantId = loadCachedTenantId();
      let resolvedTenantId: string | null = null;

      if (cachedTenantId && cachedTenantId.userId === user.id) {
        resolvedTenantId = cachedTenantId.tenantId;
      } else {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw new Error('Impossible de récupérer le profil utilisateur');
        }
        resolvedTenantId = profile?.tenant_id || null;
      }

      if (!resolvedTenantId) {
        setTenantId(null);
        setTenant(null);
        lastUserIdRef.current = user.id;
        setLoading(false);
        return;
      }

      setTenantId(resolvedTenantId);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, primary_color')
        .eq('id', resolvedTenantId)
        .single();

      if (tenantError) {
        throw new Error('Impossible de récupérer les informations du tenant');
      }

      setTenant(tenantData);
      lastUserIdRef.current = user.id;
      saveCachedTenant(user.id, resolvedTenantId, tenantData);
    } catch (err) {
      console.error('Error fetching tenant info:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  const forceRefresh = useCallback(async () => {
    lastUserIdRef.current = null;
    await fetchTenantInfo();
  }, [fetchTenantInfo]);

  useEffect(() => {
    fetchTenantInfo();
    const handler = () => {
      lastUserIdRef.current = null;
      fetchTenantInfo();
    };
    window.addEventListener('impersonation-changed', handler);
    return () => window.removeEventListener('impersonation-changed', handler);
  }, [fetchTenantInfo]);


  // Use same-user tenant cache for the first paint after refresh so the app does
  // not briefly show generic/platform branding while the fresh read completes.
  const cachedTenant = user ? loadCachedTenant() : null;
  const effectiveCachedTenant = cachedTenant && cachedTenant.userId === user?.id ? cachedTenant : null;
  const effectiveTenantId = tenantId ?? effectiveCachedTenant?.tenantId ?? null;
  const effectiveTenant = tenant ?? effectiveCachedTenant?.tenant ?? null;
  const effectiveLoading = authLoading || ((effectiveTenantId || effectiveTenant) ? false : loading);

  const withTenantId = useCallback(<T extends object>(data: T): T & { tenant_id: string | null } => {
    return { ...data, tenant_id: effectiveTenantId };
  }, [effectiveTenantId]);

  const forInsert = useCallback(<T extends object>(data: T): T & { tenant_id: string } => {
    if (!effectiveTenantId) {
      throw new Error('Aucun tenant associé à cet utilisateur. Impossible de créer des données.');
    }
    return { ...data, tenant_id: effectiveTenantId };
  }, [effectiveTenantId]);

  return {
    tenantId: effectiveTenantId,
    tenant: effectiveTenant,
    loading: effectiveLoading,
    error,
    withTenantId,
    forInsert,
    hasTenant: !!effectiveTenantId,
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
