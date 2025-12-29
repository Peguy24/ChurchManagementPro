import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhiteLabelSettings {
  app_name: string;
  app_subtitle: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const defaultSettings: WhiteLabelSettings = {
  app_name: "Church of God",
  app_subtitle: "Ministry of Prayer and of The Word",
  logo_url: "/images/church-logo.png",
  primary_color: "#3B82F6",
  secondary_color: "#1E40AF",
  accent_color: "#8B5CF6",
};

export function useWhiteLabel() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ["white-label-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("church_settings")
        .select("setting_key, setting_value")
        .in("setting_key", [
          "app_name",
          "app_subtitle",
          "logo_url",
          "primary_color",
          "secondary_color",
          "accent_color",
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });

      return {
        app_name: settingsMap.app_name || defaultSettings.app_name,
        app_subtitle: settingsMap.app_subtitle || defaultSettings.app_subtitle,
        logo_url: settingsMap.logo_url || defaultSettings.logo_url,
        primary_color: settingsMap.primary_color || defaultSettings.primary_color,
        secondary_color: settingsMap.secondary_color || defaultSettings.secondary_color,
        accent_color: settingsMap.accent_color || defaultSettings.accent_color,
      } as WhiteLabelSettings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    settings: settings || defaultSettings,
    isLoading,
  };
}
