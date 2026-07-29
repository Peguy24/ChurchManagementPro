import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
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

interface UserRoleContextValue {
  roles: AppRole[];
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (checkRoles: AppRole[]) => boolean;
  canAccess: (path: string) => boolean;
  canSeeNav: (navGroupLabel: string) => boolean;
  canSeeItem: (itemPath: string) => boolean;
  hasPermissionFor: (group: RouteGroup) => boolean;
}

const UserRoleContext = createContext<UserRoleContextValue | undefined>(undefined);

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

// Read cache once at module level.
// Only trust a cache that represents an APPROVED user: a stale "pending" cache
// would otherwise bounce an approved admin to /pending-approval before the
// fresh role fetch resolves.
const rawRoleCache = loadCachedRoles();
const initialRoleCache = rawRoleCache?.isApproved ? rawRoleCache : null;

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [roles, setRoles] = useState<AppRole[]>(initialRoleCache?.roles ?? []);
  const [permissions, setPermissions] = useState<Record<AppRole, RouteGroup[]>>(
    initialRoleCache?.permissions ?? DEFAULT_ROLE_PERMISSIONS
  );
  const [loading, setLoading] = useState(!initialRoleCache);
  const [isApproved, setIsApproved] = useState(initialRoleCache?.isApproved ?? false);
  const [isAdmin, setIsAdmin] = useState(initialRoleCache?.isAdmin ?? false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialRoleCache?.isSuperAdmin ?? false);
  const [resolved, setResolved] = useState(false);
  const fetchedRef = useRef(false);
  const attemptsRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cachedUserIdRef = useRef<string | null>(initialRoleCache?.userId ?? null);


  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setResolved(true);
        fetchedRef.current = false;
        attemptsRef.current = 0;
        return;
      }

      // Drop any cached state that belongs to a different user
      if (cachedUserIdRef.current && cachedUserIdRef.current !== user.id) {
        cachedUserIdRef.current = null;
        try { sessionStorage.removeItem(ROLE_CACHE_KEY); } catch {}
        setRoles([]);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setPermissions(DEFAULT_ROLE_PERMISSIONS);
      }

      // Skip if already fetched for this user
      if (fetchedRef.current) return;

      // Retry transient failures instead of declaring the user "pending".
      const scheduleRetry = () => {
        if (attemptsRef.current >= 3) return false;
        attemptsRef.current += 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          fetchedRef.current = false;
          fetchRolesAndPermissions();
        }, 400 * attemptsRef.current);
        return true;
      };

      try {
        const [rolesResult, profileResult] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle(),
        ]);

        // A failed read (network hiccup / token still refreshing right after a
        // page refresh) must not be interpreted as "no roles".
        if (rolesResult.error || profileResult.error) {
          if (scheduleRetry()) return;
        }




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
          setResolved(true);
          fetchedRef.current = true;
          cachedUserIdRef.current = user.id;
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
              .order("is_approved", { ascending: false }),
            supabase
              .from("role_permissions")
              .select("role, permission_group")
              .eq("tenant_id", tenantId),
          ]);

          if (tenantRoleResult.error) {
            console.error("Error fetching tenant_user_roles:", tenantRoleResult.error);
            if (scheduleRetry()) return;
          }


          // A user may have more than one row (e.g. a leftover pending "user" row
          // alongside their approved role). Always prefer an approved role, and
          // prefer "admin" among approved rows.
          const tenantRoleRows = tenantRoleResult.data ?? [];
          const approvedRows = tenantRoleRows.filter((r) => r.is_approved);
          const tenantRoleData =
            approvedRows.find((r) => r.role === "admin") ??
            approvedRows[0] ??
            tenantRoleRows[0] ??
            null;

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
          cachedUserIdRef.current = user.id;
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
        if (scheduleRetry()) return;
        setRoles([]);
        setIsApproved(false);
        setIsAdmin(false);
        setIsSuperAdmin(false);
      } finally {
        if (fetchedRef.current || attemptsRef.current >= 3) {
          setLoading(false);
          setResolved(true);
        }
      }


    }

    if (!authLoading) {
      fetchRolesAndPermissions();
    }

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [user, authLoading]);


  const hasRole = (role: AppRole): boolean => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]): boolean => checkRoles.some((role) => roles.includes(role));
  const canAccess = (path: string): boolean => canAccessRouteWithPerms(roles, path, permissions);
  const canSeeNav = (navGroupLabel: string): boolean => canSeeNavGroupWithPerms(roles, navGroupLabel, permissions);
  const canSeeItem = (itemPath: string): boolean => canSeeNavItemWithPerms(roles, itemPath, permissions);
  const hasPermissionFor = (group: RouteGroup): boolean => hasPermissionWithPerms(roles, group, permissions);

  // Trust cached data only when it belongs to the signed-in user AND says approved.
  // Otherwise stay "loading" until the fresh fetch resolves, so nobody is bounced
  // to /pending-approval on a stale or partial state.
  const hasUsableCache =
    roles.length > 0 && isApproved && (!user || cachedUserIdRef.current === user.id);
  const effectiveLoading = hasUsableCache ? false : (authLoading || loading || !resolved);


  const value: UserRoleContextValue = {
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

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>;
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
