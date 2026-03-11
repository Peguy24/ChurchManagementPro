import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { Church } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, isAdmin, isSuperAdmin, canAccess, loading: roleLoading } = useUserRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);
  const hadUserRef = useRef(false);

  const loading = authLoading || roleLoading || tenantLoading;

  // Track if user was ever authenticated in this session
  useEffect(() => {
    if (user) hadUserRef.current = true;
  }, [user]);

  useEffect(() => {
    // Only redirect to commercial if we never had a user (not a transient state)
    if (!loading && !user && !hadUserRef.current) {
      navigate('/commercial');
    }
    // If user was previously authenticated but is now null, wait briefly for token refresh
    if (!loading && !user && hadUserRef.current) {
      const timeout = setTimeout(() => {
        // Re-check after delay
        if (!user) {
          hadUserRef.current = false;
          navigate('/commercial');
        }
      }, 2000);
      return () => clearTimeout(timeout);
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
      navigate('/');
    }
    if (!loading && user && isApproved && requireSuperAdmin && !isSuperAdmin) {
      navigate('/');
    }
  }, [user, loading, isApproved, isAdmin, isSuperAdmin, requireAdmin, requireSuperAdmin, navigate]);

  // Super admin redirection: if admin without tenant, redirect to super admin dashboard
  useEffect(() => {
    if (!loading && user && isApproved && isSuperAdmin && !tenantId && !hasRedirected) {
      if (location.pathname === '/') {
        setHasRedirected(true);
        navigate('/super-admin');
      }
    }
  }, [user, loading, isApproved, isSuperAdmin, tenantId, hasRedirected, navigate, location.pathname]);

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

  // If super admin is required, user must be super admin
  if (requireSuperAdmin && !isSuperAdmin) {
    return null;
  }

  // Check route permissions
  if (!canAccess(location.pathname)) {
    return null;
  }

  return <>{children}</>;
}
