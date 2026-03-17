import { useEffect, useState, useRef } from "react";
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
const ROLE_CACHE_KEY = 'user_role_cache';

interface CachedRoleState {
  userId: string;
  roles: AppRole[];
  isApproved: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: Record<AppRole, RouteGroup[]>;
}

function loadCachedRoles(): CachedRoleState | null {
  try {
    const raw = sessionStorage.getItem(ROLE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedRoleState;
  } catch {
    return null;
  }
}

function saveCachedRoles(state: CachedRoleState) {
  try {
    sessionStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(state));
  } catch {}
}

// Read cache once at module level
const initialRoleCache = loadCachedRoles();

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const [roles, setRoles] = useState<AppRole[]>(initialRoleCache?.roles ?? []);
  const [permissions, setPermissions] = useState<Record<AppRole, RouteGroup[]>>(
    initialRoleCache?.permissions ?? DEFAULT_ROLE_PERMISSIONS
  );
  const [loading, setLoading] = useState(!initialRoleCache);
  const [isApproved, setIsApproved] = useState(initialRoleCache?.isApproved ?? false);
  const [isAdmin, setIsAdmin] = useState(initialRoleCache?.isAdmin ?? false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialRoleCache?.isSuperAdmin ?? false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        fetchedRef.current = false;
        return;
      }

      // Skip if already fetched for this user
      if (fetchedRef.current) return;

      try {
        const [rolesResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("tenant_id").eq("id", user.id).single(),
        ]);

        if (rolesResult.error) {
          console.error("Error fetching user_roles:", rolesResult.error);
        }

        const globalRoles = rolesResult.data?.map((r) => r.role) || [];
        const tenantId = profileResult.data?.tenant_id;

        // Pre-populate tenant cache so useCurrentTenant doesn't re-fetch profiles
        if (tenantId) {
          try {
            const existingCache = sessionStorage.getItem('tenant_cache');
            if (!existingCache || !JSON.parse(existingCache)?.tenantId || JSON.parse(existingCache)?.userId !== user.id) {
              // Store partial cache with tenantId so useCurrentTenant can skip profiles query
              sessionStorage.setItem('tenant_cache_tenant_id', JSON.stringify({ userId: user.id, tenantId }));
            }
          } catch {}
        }
        
        const isSuperAdminResult = globalRoles.includes("admin");
        
        if (isSuperAdminResult) {
          setRoles(globalRoles);
          setIsApproved(true);
          setIsAdmin(true);
          setIsSuperAdmin(true);
          setPermissions(DEFAULT_ROLE_PERMISSIONS);
          setLoading(false);
          fetchedRef.current = true;
          saveCachedRoles({
            userId: user.id, roles: globalRoles, isApproved: true,
            isAdmin: true, isSuperAdmin: true, permissions: DEFAULT_ROLE_PERMISSIONS,
          });
          return;
        }

        // tenantId already fetched above

        if (tenantId) {
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
          let finalRoles = globalRoles;
          let finalApproved = false;
          let finalAdmin = false;
          let finalPerms = DEFAULT_ROLE_PERMISSIONS;

          if (tenantRoleData) {
            const tenantRole = tenantRoleData.role as AppRole;
            const tenantApproved = tenantRoleData.is_approved;
            const customRoleId = (tenantRoleData as any).custom_role_id as string | null;
            
            finalRoles = [...new Set([...globalRoles, tenantRole])];
            finalApproved = tenantApproved;
            finalAdmin = tenantRole === "admin" && tenantApproved;

            if (tenantApproved) {
              if (customRoleId) {
                const { data: customPerms, error: customError } = await supabase
                  .from("tenant_custom_role_permissions")
                  .select("permission_group")
                  .eq("custom_role_id", customRoleId);

                if (!customError && customPerms && customPerms.length > 0) {
                  const customPermGroups = customPerms.map((p) => p.permission_group as RouteGroup);
                  const dbPermissions: Record<AppRole, RouteGroup[]> = {
                    admin: DEFAULT_ROLE_PERMISSIONS.admin,
                    pastor: [], treasurer: [], secretary: [], volunteer: [], user: [],
                  };
                  dbPermissions[tenantRole] = customPermGroups;
                  finalPerms = dbPermissions;
                }
              } else {
                const permData = permResult.data;
                const permError = permResult.error;

                if (!permError && permData && permData.length > 0) {
                  const dbPermissions: Record<AppRole, RouteGroup[]> = {
                    admin: DEFAULT_ROLE_PERMISSIONS.admin,
                    pastor: [], treasurer: [], secretary: [], volunteer: [], user: [],
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

                  finalPerms = dbPermissions;
                }
              }
            }
          }

          setRoles(finalRoles);
          setIsApproved(finalApproved);
          setIsAdmin(finalAdmin);
          setIsSuperAdmin(false);
          setPermissions(finalPerms);
          fetchedRef.current = true;
          saveCachedRoles({
            userId: user.id, roles: finalRoles, isApproved: finalApproved,
            isAdmin: finalAdmin, isSuperAdmin: false, permissions: finalPerms,
          });
        } else {
          const hasApprovedRole = globalRoles.some((role) => APPROVED_ROLES.includes(role));
          setRoles(globalRoles);
          setIsApproved(hasApprovedRole);
          setIsAdmin(globalRoles.includes("admin"));
          setIsSuperAdmin(false);
          fetchedRef.current = true;
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

  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]): boolean => checkRoles.some((role) => roles.includes(role));
  const canAccess = (path: string): boolean => canAccessRouteWithPerms(roles, path, permissions);
  const canSeeNav = (navGroupLabel: string): boolean => canSeeNavGroupWithPerms(roles, navGroupLabel, permissions);
  const canSeeItem = (itemPath: string): boolean => canSeeNavItemWithPerms(roles, itemPath, permissions);
  const hasPermissionFor = (group: RouteGroup): boolean => hasPermissionWithPerms(roles, group, permissions);

  // If we have cached data, don't wait for auth
  const hasCachedData = roles.length > 0;
  const effectiveLoading = hasCachedData ? false : (authLoading || loading);

  return {
    roles,
    loading: effectiveLoading,
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
