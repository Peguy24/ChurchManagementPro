import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Church } from 'lucide-react';
import Layout from '@/components/Layout';
import SubscriptionBlockPage from '@/components/SubscriptionBlockPage';

// Paths that are accessible even without an active subscription
const SUBSCRIPTION_EXEMPT_PATHS = [
  '/settings/subscription',
  '/pending-approval',
  '/support',
  '/system-guide',
];

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
    if (loading) return;

    if (!user) {
      // Give a generous grace period for token refresh before redirecting
      const timeout = setTimeout(() => {
        if (!userRef.current) {
          navigate('/commercial');
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isApproved) {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Church className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (location.pathname === '/pending-approval') {
    return <>{children}</>;
  }

  if (!isApproved) return null;
  if (requireAdmin && !isAdmin) return null;
  if (requireSuperAdmin && !isSuperAdmin) return null;
  if (!canAccess(location.pathname)) return null;

  // Subscription enforcement: show block page if no active plan
  // Exempt: super admins, subscription-exempt paths, and while still loading plan data
  if (!planLoading && user && isApproved && !isSuperAdmin && tenantId) {
    const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some(p => location.pathname.startsWith(p));
    if (!isExempt && !plan) {
      const reason = subscriptionStatus === "past_due" ? "past_due"
        : subscriptionStatus === "cancelled" ? "cancelled"
        : subscriptionStatus === "trial" ? "trial_ended"
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
