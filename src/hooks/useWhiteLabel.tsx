import { useCurrentTenant } from "./useCurrentTenant";
import { useUserRole } from "./useUserRole";

export interface WhiteLabelSettings {
  app_name: string;
  app_subtitle: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const defaultSettings: WhiteLabelSettings = {
  app_name: "Church Management",
  app_subtitle: "Administration Platform",
  logo_url: "",
  primary_color: "#6366f1",
  secondary_color: "#4f46e5",
  accent_color: "#8b5cf6",
};

export function useWhiteLabel() {
  const { tenant, loading: tenantLoading } = useCurrentTenant();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  const settings: WhiteLabelSettings = tenant && !isSuperAdmin
    ? {
        app_name: tenant.name || defaultSettings.app_name,
        app_subtitle: "",
        logo_url: tenant.logo_url || defaultSettings.logo_url,
        primary_color: tenant.primary_color || defaultSettings.primary_color,
        secondary_color: tenant.primary_color || defaultSettings.secondary_color,
        accent_color: defaultSettings.accent_color,
      }
    : defaultSettings;

  return {
    settings,
    isLoading: tenantLoading || roleLoading,
  };
}
