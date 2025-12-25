import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define all route groups
export type RouteGroup = 
  | "dashboard"
  | "members"
  | "attendance"
  | "ministries"
  | "branches"
  | "finances"
  | "events"
  | "reports"
  | "communication"
  | "settings"
  | "users";

// Define permissions per role
export const ROLE_PERMISSIONS: Record<AppRole, RouteGroup[]> = {
  admin: [
    "dashboard",
    "members",
    "attendance",
    "ministries",
    "branches",
    "finances",
    "events",
    "reports",
    "communication",
    "settings",
    "users",
  ],
  pastor: [
    "dashboard",
    "members",
    "attendance",
    "ministries",
    "branches",
    "events",
    "reports",
    "communication",
    "settings",
  ],
  treasurer: [
    "dashboard",
    "finances",
    "reports",
  ],
  secretary: [
    "dashboard",
    "members",
    "attendance",
    "events",
    "communication",
  ],
  volunteer: [
    "dashboard",
    "attendance",
  ],
  user: [], // Pending users have no access
};

// Map routes to their groups
export const ROUTE_TO_GROUP: Record<string, RouteGroup> = {
  "/": "dashboard",
  "/members": "members",
  "/members/cards": "members",
  "/members/details": "members",
  "/attendance": "attendance",
  "/attendance/stats": "attendance",
  "/attendance/alerts": "attendance",
  "/attendance/comparison": "reports",
  "/donations": "finances",
  "/donations/categories": "finances",
  "/donations/reports": "reports",
  "/finance": "finances",
  "/finance/budgets": "finances",
  "/finance/expenses": "finances",
  "/finance/expenses/categories": "finances",
  "/finance/bank": "finances",
  "/finance/funds": "finances",
  "/finance/cash": "finances",
  "/finance/audit": "finances",
  "/events": "events",
  "/ministries": "ministries",
  "/ministries/details": "ministries",
  "/ministries/stats": "ministries",
  "/branches": "branches",
  "/custom-fields": "settings",
  "/settings/email-templates": "communication",
  "/settings/church": "settings",
  "/settings/users": "users",
};

// Map nav groups to route groups
export const NAV_GROUP_TO_ROUTE_GROUP: Record<string, RouteGroup[]> = {
  "Membres": ["members", "attendance", "branches", "ministries"],
  "Finances": ["finances"],
  "Rapports": ["dashboard", "reports", "finances"],
  "Communication": ["communication"],
  "Planning": ["events"],
  "Paramètres": ["settings", "users"],
  "Inventaire": [],
};

// Helper to check if a role has permission for a route group
export function hasPermission(roles: AppRole[], group: RouteGroup): boolean {
  return roles.some(role => ROLE_PERMISSIONS[role]?.includes(group));
}

// Helper to check if a role can access a specific route
export function canAccessRoute(roles: AppRole[], path: string): boolean {
  // Remove query params for matching
  const cleanPath = path.split("?")[0];
  const group = ROUTE_TO_GROUP[cleanPath];
  
  if (!group) {
    // Unknown route - allow if user has any approved role
    return roles.some(role => role !== "user");
  }
  
  return hasPermission(roles, group);
}

// Helper to check if a nav group should be visible to user
export function canSeeNavGroup(roles: AppRole[], navGroupLabel: string): boolean {
  const routeGroups = NAV_GROUP_TO_ROUTE_GROUP[navGroupLabel];
  
  if (!routeGroups || routeGroups.length === 0) {
    return false;
  }
  
  return routeGroups.some(group => hasPermission(roles, group));
}

// Helper to check if a nav item should be visible
export function canSeeNavItem(roles: AppRole[], itemPath: string): boolean {
  const cleanPath = itemPath.split("?")[0];
  const group = ROUTE_TO_GROUP[cleanPath];
  
  if (!group) {
    return roles.some(role => role !== "user");
  }
  
  return hasPermission(roles, group);
}

// Get readable permission names for display
export const ROUTE_GROUP_LABELS: Record<RouteGroup, string> = {
  dashboard: "Tableau de bord",
  members: "Gestion des membres",
  attendance: "Présences",
  ministries: "Ministères",
  branches: "Branches",
  finances: "Finances",
  events: "Événements",
  reports: "Rapports",
  communication: "Communication",
  settings: "Paramètres",
  users: "Gestion utilisateurs",
};
