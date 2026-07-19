import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

// Define all route groups
export type RouteGroup =
  | "dashboard"
  | "members"
  | "attendance"
  | "attendance_admin"
  | "ministries"
  | "branches"
  | "finances"
  | "events"
  | "reports"
  | "communication"
  | "settings"
  | "users"
  | "inventory"
  | "tenants"
  | "volunteers"
  | "visitors"
  | "website"
  | "giving"
  | "prayer_requests"
  | "insights"
  | "automations"
  | "subscription";

// Default permissions (fallback when DB is not available)
export const DEFAULT_ROLE_PERMISSIONS: Record<AppRole, RouteGroup[]> = {
  admin: [
    "dashboard",
    "members",
    "attendance",
    "attendance_admin",
    "ministries",
    "branches",
    "finances",
    "events",
    "reports",
    "communication",
    "settings",
    "users",
    "inventory",
    "tenants",
    "volunteers",
    "visitors",
    "website",
    "giving",
    "prayer_requests",
    "insights",
    "automations",
    "subscription",
  ],
  pastor: [
    "dashboard",
    "members",
    "attendance",
    "attendance_admin",
    "ministries",
    "branches",
    "events",
    "reports",
    "communication",
    "settings",
    "inventory",
    "volunteers",
    "visitors",
    "website",
    "prayer_requests",
    "insights",
    "automations",
  ],
  treasurer: [
    "dashboard",
    "finances",
    "reports",
    "inventory",
    "giving",
    "subscription",
  ],
  secretary: [
    "dashboard",
    "members",
    "attendance",
    "attendance_admin",
    "events",
    "communication",
    "inventory",
    "visitors",
    "website",
    "prayer_requests",
    "automations",
  ],
  volunteer: [
    "dashboard",
    "attendance",
  ],
  user: [],
};

// Map routes to their groups
export const ROUTE_TO_GROUP: Record<string, RouteGroup> = {
  "/": "dashboard",
  "/members": "members",
  "/members/cards": "members",
  "/members/requests": "members",
  "/members/details": "members",
  "/attendance": "attendance",
  "/attendance/stats": "attendance_admin",
  "/attendance/alerts": "attendance_admin",
  "/attendance/kiosk": "attendance",
  "/attendance/comparison": "reports",
  "/attendance/arrivals": "attendance_admin",
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
  "/events/calendar": "events",
  "/ministries": "ministries",
  "/ministries/details": "ministries",
  "/ministries/stats": "ministries",
  "/branches": "branches",
  "/custom-fields": "settings",
  "/settings/email-templates": "communication",
  "/settings/church": "settings",
  "/settings/data-management": "settings",
  "/settings/users": "users",
  "/settings/tenants": "tenants",
  "/inventory": "inventory",
  "/finance/salaries": "finances",
  "/insights": "reports",
  "/automations": "communication",
  "/support": "communication",
  "/support-management": "tenants",
  "/volunteers": "volunteers",
  "/visitors": "visitors",
};

// Map nav groups to route groups (using internal keys, not translated labels)
export const NAV_GROUP_TO_ROUTE_GROUP: Record<string, RouteGroup[]> = {
  "members": ["members", "attendance", "attendance_admin", "branches", "ministries", "visitors"],
  "finances": ["finances"],
  "reports": ["dashboard", "reports", "finances"],
  "communication": ["communication"],
  "planning": ["events", "volunteers"],
  "settings": ["settings", "users", "tenants"],
  "inventory": ["inventory"],
  "administration": ["dashboard", "tenants", "users"],
  "support": ["communication"],
};

// Helper to check if a role has permission for a route group (using provided permissions)
export function hasPermissionWithPerms(roles: AppRole[], group: RouteGroup, permissions: Record<AppRole, RouteGroup[]>): boolean {
  return roles.some(role => permissions[role]?.includes(group));
}

// Helper to check if a role has permission for a route group (using defaults)
export function hasPermission(roles: AppRole[], group: RouteGroup): boolean {
  return hasPermissionWithPerms(roles, group, DEFAULT_ROLE_PERMISSIONS);
}

// Helper to check if a role can access a specific route
export function canAccessRouteWithPerms(roles: AppRole[], path: string, permissions: Record<AppRole, RouteGroup[]>): boolean {
  // Remove query params for matching
  const cleanPath = path.split("?")[0];
  const group = ROUTE_TO_GROUP[cleanPath];
  
  if (!group) {
    // Unknown route - allow if user has any approved role
    return roles.some(role => role !== "user");
  }
  
  return hasPermissionWithPerms(roles, group, permissions);
}

export function canAccessRoute(roles: AppRole[], path: string): boolean {
  return canAccessRouteWithPerms(roles, path, DEFAULT_ROLE_PERMISSIONS);
}

// Helper to check if a nav group should be visible to user
export function canSeeNavGroupWithPerms(roles: AppRole[], navGroupLabel: string, permissions: Record<AppRole, RouteGroup[]>): boolean {
  const routeGroups = NAV_GROUP_TO_ROUTE_GROUP[navGroupLabel];
  
  if (!routeGroups || routeGroups.length === 0) {
    return false;
  }
  
  return routeGroups.some(group => hasPermissionWithPerms(roles, group, permissions));
}

export function canSeeNavGroup(roles: AppRole[], navGroupLabel: string): boolean {
  return canSeeNavGroupWithPerms(roles, navGroupLabel, DEFAULT_ROLE_PERMISSIONS);
}

// Helper to check if a nav item should be visible
export function canSeeNavItemWithPerms(roles: AppRole[], itemPath: string, permissions: Record<AppRole, RouteGroup[]>): boolean {
  const cleanPath = itemPath.split("?")[0];
  const group = ROUTE_TO_GROUP[cleanPath];
  
  if (!group) {
    return roles.some(role => role !== "user");
  }
  
  return hasPermissionWithPerms(roles, group, permissions);
}

export function canSeeNavItem(roles: AppRole[], itemPath: string): boolean {
  return canSeeNavItemWithPerms(roles, itemPath, DEFAULT_ROLE_PERMISSIONS);
}

// Get readable permission names for display
export const ROUTE_GROUP_LABELS: Record<RouteGroup, string> = {
  dashboard: "Tableau de bord",
  members: "Gestion des membres",
  attendance: "Présences (Scanner)",
  attendance_admin: "Présences (Alertes & Rapports)",
  ministries: "Ministères",
  branches: "Branches",
  finances: "Finances",
  events: "Événements",
  reports: "Rapports",
  communication: "Communication",
  settings: "Paramètres",
  users: "Gestion utilisateurs",
  inventory: "Inventaire",
  tenants: "Gestion Multi-Tenant",
  volunteers: "Planification Bénévoles",
  visitors: "Gestion Visiteurs",
};
