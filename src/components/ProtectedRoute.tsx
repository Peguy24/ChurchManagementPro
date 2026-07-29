import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import Layout from '@/components/Layout';
import SubscriptionBlockPage from '@/components/SubscriptionBlockPage';
import MaintenancePage from '@/components/MaintenancePage';
import { Skeleton } from '@/components/ui/skeleton';
import AppShellSkeleton from '@/components/AppShellSkeleton';

// Set once the very first auth/role bootstrap completes in this browser session.
let hasBootstrapped = false;

// Paths that are accessible even without an active subscription
const SUBSCRIPTION_EXEMPT_PATHS = [
  '/settings/subscription',
  '/pending-approval',
  '/support',
  '/system-guide',
];

function RouteBootSkeleton() {
  return <AppShellSkeleton />;
}

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, isAdmin, isSuperAdmin, canAccess, loading: roleLoading } = useUserRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const { plan, loading: planLoading, subscriptionStatus } = usePlanLimits();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);
  const userRef = useRef(user);

  // Keep userRef always in sync with latest user value
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loading = authLoading || roleLoading || tenantLoading;

  useEffect(() => {
    if (!loading && user) hasBootstrapped = true;
  }, [loading, user]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Give a generous grace period for token refresh before redirecting
      const timeout = setTimeout(() => {
        if (!userRef.current) {
          navigate('/commercial');
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isApproved) {
      if (location.pathname !== '/pending-approval') {
        // Grace period: right after a refresh the role read can still be
        // settling. Only redirect if we're still unapproved a moment later.
        const t = setTimeout(() => navigate('/pending-approval'), 1200);
        return () => clearTimeout(t);
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

  // Super admin redirection
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
      if (!canAccess(location.pathname) && location.pathname !== '/pending-approval') {
        // Find the first accessible route as fallback instead of always "/"
        const fallbackRoutes = ['/attendance', '/members', '/donations', '/events', '/ministries', '/inventory', '/'];
        const fallback = fallbackRoutes.find(r => canAccess(r)) || '/pending-approval';
        navigate(fallback);
      }
    }
  }, [user, loading, isApproved, canAccess, location.pathname, requireAdmin, navigate]);

  if (loading || !user) {
    // Do not render Layout before auth/tenant identity is known; otherwise a
    // tenant refresh can briefly show generic or platform branding.
    return <RouteBootSkeleton />;
  }

  if (location.pathname === '/pending-approval') {
    return <>{children}</>;
  }

  if (!isApproved) {
    return (
      <Layout>
        <div className="space-y-4 p-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (requireAdmin && !isAdmin) return null;
  if (requireSuperAdmin && !isSuperAdmin) return null;
  if (!canAccess(location.pathname)) return null;

  // Maintenance mode: block non-super-admins
  if (!maintenanceLoading && isMaintenanceMode && !isSuperAdmin) {
    return <MaintenancePage />;
  }

  // Subscription enforcement: show block page if no active plan
  // Exempt: super admins, subscription-exempt paths, and while still loading plan data
  if (!planLoading && user && isApproved && !isSuperAdmin && tenantId) {
    const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some(p => location.pathname.startsWith(p));
    if (!isExempt && !plan) {
      const status = subscriptionStatus as string;
      const reason = status === "past_due" ? "past_due"
        : status === "cancelled" ? "cancelled"
        : status === "trial" ? "trial_ended"
        : "expired";
      return (
        <Layout>
          <SubscriptionBlockPage reason={reason as any} />
        </Layout>
      );
    }
  }

  return <>{children}</>;
}
