import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { canAccessRoute, canSeeNavGroup, canSeeNavItem, hasPermission, type RouteGroup } from "@/lib/permissions";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const APPROVED_ROLES: AppRole[] = ["admin", "pastor", "treasurer", "secretary", "volunteer"];

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchRoles() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        setIsApproved(false);
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        const userRoles = data?.map((r) => r.role) || [];
        setRoles(userRoles);
        
        // Check if user has any approved role
        const hasApprovedRole = userRoles.some((role) => APPROVED_ROLES.includes(role));
        setIsApproved(hasApprovedRole);
        
        // Check if user is admin
        setIsAdmin(userRoles.includes("admin"));
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
      fetchRoles();
    }
  }, [user, authLoading]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return checkRoles.some((role) => roles.includes(role));
  };

  // Permission helpers
  const canAccess = (path: string): boolean => {
    return canAccessRoute(roles, path);
  };

  const canSeeNav = (navGroupLabel: string): boolean => {
    return canSeeNavGroup(roles, navGroupLabel);
  };

  const canSeeItem = (itemPath: string): boolean => {
    return canSeeNavItem(roles, itemPath);
  };

  const hasPermissionFor = (group: RouteGroup): boolean => {
    return hasPermission(roles, group);
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
