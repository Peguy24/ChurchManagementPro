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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      try {
        // Fetch global roles and profile in parallel
        const [rolesResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("tenant_id").eq("id", user.id).single(),
        ]);

        if (rolesResult.error) {
          console.error("Error fetching user_roles:", rolesResult.error);
        }

        const globalRoles = rolesResult.data?.map((r) => r.role) || [];
        
        // Check if user is super admin
        const isSuperAdmin = globalRoles.includes("admin");
        
        if (isSuperAdmin) {
          setRoles(globalRoles);
          setIsApproved(true);
          setIsAdmin(true);
          setIsSuperAdmin(true);
          setPermissions(DEFAULT_ROLE_PERMISSIONS);
          setLoading(false);
          return;
        }

        const tenantId = profileResult.data?.tenant_id;

        if (tenantId) {
          // Fetch tenant role and permissions in parallel
          const [tenantRoleResult, permResult] = await Promise.all([
            supabase
              .from("tenant_user_roles")
              .select("role, is_approved, custom_role_id")
              .eq("tenant_id", tenantId)
              .eq("user_id", user.id)
              .single(),
            supabase
              .from("role_permissions")
              .select("role, permission_group")
              .eq("tenant_id", tenantId),
          ]);

          if (tenantRoleResult.error) {
            console.error("Error fetching tenant_user_roles:", tenantRoleResult.error);
          }

          const tenantRoleData = tenantRoleResult.data;

          if (tenantRoleData) {
            const tenantRole = tenantRoleData.role as AppRole;
            const tenantApproved = tenantRoleData.is_approved;
            const customRoleId = (tenantRoleData as any).custom_role_id as string | null;
            
            const allRoles = [...new Set([...globalRoles, tenantRole])];
            setRoles(allRoles);
            setIsApproved(tenantApproved);
            setIsAdmin(tenantRole === "admin" && tenantApproved);

            if (tenantApproved) {
              // If user has a custom role, fetch permissions from custom role permissions
              if (customRoleId) {
                const { data: customPerms, error: customError } = await supabase
                  .from("tenant_custom_role_permissions")
                  .select("permission_group")
                  .eq("custom_role_id", customRoleId);

                if (customError) {
                  console.error("Error fetching custom role permissions:", customError);
                } else if (customPerms && customPerms.length > 0) {
                  const customPermGroups = customPerms.map((p) => p.permission_group as RouteGroup);
                  // Build permissions map with custom role permissions applied to the user's enum role
                  const dbPermissions: Record<AppRole, RouteGroup[]> = {
                    admin: DEFAULT_ROLE_PERMISSIONS.admin,
                    pastor: [],
                    treasurer: [],
                    secretary: [],
                    volunteer: [],
                    user: [],
                  };
                  // Apply custom permissions to the user's actual enum role
                  dbPermissions[tenantRole] = customPermGroups;
                  setPermissions(dbPermissions);
                }
              } else {
                // Standard role permissions from role_permissions table
                const permData = permResult.data;
                const permError = permResult.error;

                if (permError) {
                  console.error("Error fetching permissions, using defaults:", permError);
                } else if (permData && permData.length > 0) {
                  const dbPermissions: Record<AppRole, RouteGroup[]> = {
                    admin: DEFAULT_ROLE_PERMISSIONS.admin,
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

                  (['pastor', 'treasurer', 'secretary', 'volunteer', 'user'] as AppRole[]).forEach(role => {
                    if (dbPermissions[role].length === 0) {
                      dbPermissions[role] = DEFAULT_ROLE_PERMISSIONS[role];
                    }
                  });

                  setPermissions(dbPermissions);
                }
              }
            }
          } else {
            // No tenant role found
            setRoles(globalRoles);
            setIsApproved(false);
            setIsAdmin(false);
          }
        } else {
          // No tenant, just use global roles
          setRoles(globalRoles);
          const hasApprovedRole = globalRoles.some((role) => APPROVED_ROLES.includes(role));
          setIsApproved(hasApprovedRole);
          setIsAdmin(globalRoles.includes("admin"));
        }
      } catch (error) {
        console.error("Error fetching user roles:", error);
        setRoles([]);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
    isSuperAdmin,
    hasRole,
    hasAnyRole,
    canAccess,
    canSeeNav,
    canSeeItem,
    hasPermissionFor,
  };
}
