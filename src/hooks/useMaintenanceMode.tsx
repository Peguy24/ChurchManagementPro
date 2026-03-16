import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMaintenanceMode() {
  const { data: isMaintenanceMode = false, isLoading } = useQuery({
    queryKey: ["platform-maintenance-mode"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "maintenance_mode")
        .maybeSingle();
      if (error) return false;
      return data?.setting_value === true || data?.setting_value === "true";
    },
    staleTime: 1000 * 60 * 2, // Check every 2 min
    refetchInterval: 1000 * 60 * 2,
  });

  return { isMaintenanceMode, loading: isLoading };
}
