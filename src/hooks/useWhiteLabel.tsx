import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["white-label-settings", user?.id],
    queryFn: async () => {
      if (!user) return defaultSettings;

      // First check if user is super admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isSuperAdmin = rolesData?.some(r => r.role === "admin");
      
      // If super admin, return default generic branding
      if (isSuperAdmin) {
        return defaultSettings;
      }

      // Get user's tenant
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) {
        return defaultSettings;
      }

      // Get tenant branding
      const { data: tenant, error } = await supabase
        .from("tenants")
        .select("name, logo_url, primary_color")
        .eq("id", profile.tenant_id)
        .single();

      if (error || !tenant) {
        return defaultSettings;
      }

      return {
        app_name: tenant.name || defaultSettings.app_name,
        app_subtitle: "", // Churches don't have subtitles
        logo_url: tenant.logo_url || defaultSettings.logo_url,
        primary_color: tenant.primary_color || defaultSettings.primary_color,
        secondary_color: tenant.primary_color || defaultSettings.secondary_color,
        accent_color: defaultSettings.accent_color,
      } as WhiteLabelSettings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!user,
  });

  return {
    settings: settings || defaultSettings,
    isLoading,
  };
}
