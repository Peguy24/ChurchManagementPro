import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { Church } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, isAdmin, canAccess, loading: roleLoading } = useUserRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  const loading = authLoading || roleLoading || tenantLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isApproved) {
      // User is logged in but not approved - redirect to pending page
      if (location.pathname !== '/pending-approval') {
        navigate('/pending-approval');
      }
    }
  }, [user, loading, isApproved, navigate, location.pathname]);

  useEffect(() => {
    if (!loading && user && isApproved && requireAdmin && !isAdmin) {
      // User is approved but not admin and trying to access admin page
      navigate('/');
    }
  }, [user, loading, isApproved, isAdmin, requireAdmin, navigate]);

  // Super admin redirection: if admin without tenant, redirect to tenant management
  useEffect(() => {
    if (!loading && user && isApproved && isAdmin && !tenantId && !hasRedirected) {
      // Super admin without tenant - redirect to tenant management if on dashboard
      if (location.pathname === '/') {
        setHasRedirected(true);
        navigate('/settings/tenants');
      }
    }
  }, [user, loading, isApproved, isAdmin, tenantId, hasRedirected, navigate, location.pathname]);

  useEffect(() => {
    if (!loading && user && isApproved && !requireAdmin) {
      // Check route-level permissions
      if (!canAccess(location.pathname) && location.pathname !== '/pending-approval') {
        // User doesn't have permission for this route
        navigate('/');
      }
    }
  }, [user, loading, isApproved, canAccess, location.pathname, requireAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Church className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If we're on the pending approval page, let it render
  if (location.pathname === '/pending-approval') {
    return <>{children}</>;
  }

  // User must be approved to see protected content
  if (!isApproved) {
    return null;
  }

  // If admin is required, user must be admin
  if (requireAdmin && !isAdmin) {
    return null;
  }

  // Check route permissions
  if (!canAccess(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
