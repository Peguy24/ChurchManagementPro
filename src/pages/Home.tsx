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

  // Not logged in → Show commercial page immediately (don't wait for other hooks)
  if (!authLoading && !user) {
    return <Commercial />;
  }

  const loading = authLoading || roleLoading || tenantLoading || maintenanceLoading;

  // Show a neutral skeleton (no logo splash) while hooks resolve
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
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
