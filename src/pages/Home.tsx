import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useCurrentTenant } from '@/hooks/useCurrentTenant';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Church } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import Commercial from './Commercial';
import Dashboard from './Dashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import PendingApproval from './PendingApproval';
import MaintenancePage from '@/components/MaintenancePage';

// Ordered list of fallback routes for users without dashboard access
const FALLBACK_ROUTES = [
  '/attendance',
  '/members',
  '/events',
  '/donations',
  '/ministries',
  '/branches',
  '/inventory',
  '/volunteers',
  '/visitors',
];

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { isApproved, isAdmin, isSuperAdmin, canAccess, hasPermissionFor, loading: roleLoading } = useUserRole();
  const { tenantId, loading: tenantLoading } = useCurrentTenant();
  const { isMaintenanceMode, loading: maintenanceLoading } = useMaintenanceMode();

  const loading = authLoading || roleLoading || tenantLoading || maintenanceLoading;

  // Show loading state
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

  // Not logged in → Show commercial/marketing page
  if (!user) {
    return <Commercial />;
  }

  // Maintenance mode: block non-super-admins
  if (isMaintenanceMode && !isSuperAdmin) {
    return <MaintenancePage />;
  }

  // Logged in but not approved → Show pending approval page
  if (!isApproved) {
    return <PendingApproval />;
  }

  // Super admin (global admin without tenant) → Show super admin dashboard
  if (isSuperAdmin && !tenantId) {
    return <SuperAdminDashboard />;
  }

  // Check if user has dashboard permission
  if (!hasPermissionFor('dashboard')) {
    // Redirect to the first route the user can access
    const fallback = FALLBACK_ROUTES.find((route) => canAccess(route));
    if (fallback) {
      return <Navigate to={fallback} replace />;
    }
  }

  // Regular approved user with dashboard access → Show dashboard
  return <Dashboard />;
}
