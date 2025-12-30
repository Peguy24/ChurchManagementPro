import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { 
  canAccessRouteWithPerms, 
  canSeeNavGroupWithPerms, 
  canSeeNavItemWithPerms, 
  hasPermissionWithPerms, 
  DEFAULT_ROLE_PERMISSIONS,
  type RouteGroup 
} from "@/lib/permissions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const APPROVED_ROLES: AppRole[] = ["admin", "pastor", "treasurer", "secretary", "volunteer"];

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Record<AppRole, RouteGroup[]>>(DEFAULT_ROLE_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        setIsApproved(false);
        setIsAdmin(false);
        return;
      }

      try {
        // Fetch user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (rolesError) throw rolesError;

        const userRoles = rolesData?.map((r) => r.role) || [];
        setRoles(userRoles);
        
        // Check if user has any approved role
        const hasApprovedRole = userRoles.some((role) => APPROVED_ROLES.includes(role));
        setIsApproved(hasApprovedRole);
        
        // Check if user is admin (super admin)
        const isSuperAdmin = userRoles.includes("admin");
        setIsAdmin(isSuperAdmin);

        // For super admins, use full permissions
        if (isSuperAdmin) {
          setPermissions(DEFAULT_ROLE_PERMISSIONS);
          setLoading(false);
          return;
        }

        // Get user's tenant
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (profile?.tenant_id) {
          // Fetch tenant-specific permissions
          const { data: permData, error: permError } = await supabase
            .from("role_permissions")
            .select("role, permission_group")
            .eq("tenant_id", profile.tenant_id);

          if (permError) {
            console.error("Error fetching permissions, using defaults:", permError);
          } else if (permData && permData.length > 0) {
            // Build permissions map from database
            const dbPermissions: Record<AppRole, RouteGroup[]> = {
              admin: DEFAULT_ROLE_PERMISSIONS.admin, // Admin always has full access
              pastor: [],
              treasurer: [],
              secretary: [],
              volunteer: [],
              user: [],
            };

            permData.forEach((p) => {
              if (dbPermissions[p.role] && p.role !== 'admin') {
                dbPermissions[p.role].push(p.permission_group as RouteGroup);
              }
            });

            // Use defaults for roles with no specific permissions set
            (['pastor', 'treasurer', 'secretary', 'volunteer', 'user'] as AppRole[]).forEach(role => {
              if (dbPermissions[role].length === 0) {
                dbPermissions[role] = DEFAULT_ROLE_PERMISSIONS[role];
              }
            });

            setPermissions(dbPermissions);
          }
        }
      } catch (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
        setIsApproved(false);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchRolesAndPermissions();
    }
  }, [user, authLoading]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return checkRoles.some((role) => roles.includes(role));
  };

  // Permission helpers using DB permissions
  const canAccess = (path: string): boolean => {
    return canAccessRouteWithPerms(roles, path, permissions);
  };

  const canSeeNav = (navGroupLabel: string): boolean => {
    return canSeeNavGroupWithPerms(roles, navGroupLabel, permissions);
  };

  const canSeeItem = (itemPath: string): boolean => {
    return canSeeNavItemWithPerms(roles, itemPath, permissions);
  };

  const hasPermissionFor = (group: RouteGroup): boolean => {
    return hasPermissionWithPerms(roles, group, permissions);
  };

  return {
    roles,
    loading: authLoading || loading,
    isApproved,
    isAdmin,
    hasRole,
    hasAnyRole,
    canAccess,
    canSeeNav,
    canSeeItem,
    hasPermissionFor,
  };
}
