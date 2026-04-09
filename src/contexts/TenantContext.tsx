import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
}

interface TenantRole {
  role: string;
  is_approved: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantSlug: string | null;
  tenantRole: TenantRole | null;
  isTenantAdmin: boolean;
  isTenantApproved: boolean;
  loading: boolean;
  error: string | null;
  setTenantBySlug: (slug: string) => Promise<void>;
  hasAdminAlready: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Detect tenant from subdomain or URL path
function detectTenantSlug(): string | null {
  const hostname = window.location.hostname;
  
  // Skip detection on known platform domains (Lovable preview, localhost, etc.)
  if (
    hostname.endsWith('.lovable.app') ||
    hostname.endsWith('.lovableproject.com') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  ) {
    // Only check path-based tenant on platform domains
    const pathMatch = window.location.pathname.match(/^\/t\/([^\/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }
    return null;
  }

  // Check for subdomain (e.g., mon-eglise.app.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    // Exclude common subdomains and UUID-like strings
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subdomain);
    if (!isUUID && !['www', 'app', 'api', 'admin', 'localhost'].includes(subdomain)) {
      return subdomain;
    }
  }
  
  // Check for path-based tenant (e.g., /t/mon-eglise)
  const pathMatch = window.location.pathname.match(/^\/t\/([^\/]+)/);
  if (pathMatch) {
    return pathMatch[1];
  }
  
  return null;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantRole, setTenantRole] = useState<TenantRole | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAdminAlready, setHasAdminAlready] = useState(false);

  // Detect tenant from URL on mount
  useEffect(() => {
    const slug = detectTenantSlug();
    if (slug) {
      setTenantBySlug(slug);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user's role in current tenant when user or tenant changes
  useEffect(() => {
    if (user && tenant) {
      fetchUserTenantRole();
    } else {
      setTenantRole(null);
    }
  }, [user, tenant]);

  async function setTenantBySlug(slug: string) {
    setLoading(true);
    setError(null);
    
    try {
      const { data: rpcData, error: fetchError } = await supabase
        .rpc('get_tenant_by_slug', { _slug: slug });
      const data = rpcData?.[0] ?? null;
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Église non trouvée');
        } else {
          setError(fetchError.message);
        }
        setTenant(null);
      } else if (data) {
        setTenant({
          ...data,
          contact_email: '',
          contact_phone: '',
          address: '',
        });
        setTenantSlug(slug);
        
        // Check if tenant has admin already
        const { data: hasAdmin } = await supabase
          .rpc('tenant_has_admin', { _tenant_id: data.id });
        setHasAdminAlready(!!hasAdmin);
      }
    } catch (err) {
      setError('Erreur lors de la récupération des informations');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserTenantRole() {
    if (!user || !tenant) return;
    
    try {
      const { data, error: roleError } = await supabase
        .from('tenant_user_roles')
        .select('role, is_approved')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user.id)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching tenant role:', roleError);
      }
      
      setTenantRole(data || null);
    } catch (err) {
      console.error('Error fetching tenant role:', err);
    }
  }

  const isTenantAdmin = tenantRole?.role === 'admin' && tenantRole?.is_approved === true;
  const isTenantApproved = tenantRole?.is_approved === true;

  return (
    <TenantContext.Provider
      value={{
        tenant,
        tenantSlug,
        tenantRole,
        isTenantAdmin,
        isTenantApproved,
        loading,
        error,
        setTenantBySlug,
        hasAdminAlready,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

export { detectTenantSlug };
