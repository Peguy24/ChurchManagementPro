import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
}

export function useCustomRoles() {
  const { tenantId } = useCurrentTenant();

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ["tenant-custom-roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_custom_roles")
        .select("id, tenant_id, name, description")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as CustomRole[];
    },
    enabled: !!tenantId,
  });

  return { customRoles, isLoading };
}
