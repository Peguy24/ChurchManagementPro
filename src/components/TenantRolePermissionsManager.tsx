import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Save } from "lucide-react";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Database } from "@/integrations/supabase/types";
import type { RouteGroup } from "@/lib/permissions";

type AppRole = Database["public"]["Enums"]["app_role"];

const EDITABLE_ROLES: AppRole[] = ["pastor", "treasurer", "secretary", "volunteer"];
const ALL_PERMISSION_GROUPS: RouteGroup[] = [
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
];

interface RolePermission {
  role: AppRole;
  permission_group: string;
  tenant_id: string | null;
}

export default function TenantRolePermissionsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const [localPermissions, setLocalPermissions] = useState<Record<AppRole, RouteGroup[]>>({} as Record<AppRole, RouteGroup[]>);
  const [hasChanges, setHasChanges] = useState(false);

  const ROLE_LABELS: Record<AppRole, string> = {
    admin: t("rolePermissions.roleAdmin"),
    pastor: t("rolePermissions.rolePastor"),
    treasurer: t("rolePermissions.roleTreasurer"),
    secretary: t("rolePermissions.roleSecretary"),
    volunteer: t("rolePermissions.roleVolunteer"),
    user: t("rolePermissions.roleUser"),
  };

  const GROUP_LABELS: Record<RouteGroup, string> = {
    dashboard: t("rolePermissions.groupDashboard"),
    members: t("rolePermissions.groupMembers"),
    attendance: t("rolePermissions.groupAttendance"),
    ministries: t("rolePermissions.groupMinistries"),
    branches: t("rolePermissions.groupBranches"),
    finances: t("rolePermissions.groupFinances"),
    events: t("rolePermissions.groupEvents"),
    reports: t("rolePermissions.groupReports"),
    communication: t("rolePermissions.groupCommunication"),
    settings: t("rolePermissions.groupSettings"),
    inventory: t("rolePermissions.groupInventory"),
    users: t("rolePermissions.groupUsers"),
    tenants: t("rolePermissions.groupTenants"),
  };

  // Fetch current permissions from database for this tenant
  const { data: dbPermissions, isLoading } = useQuery({
    queryKey: ["tenant-role-permissions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_group, tenant_id")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!tenantId,
  });

  // Initialize local state from DB data or with defaults
  useEffect(() => {
    if (dbPermissions !== undefined) {
      const grouped: Record<AppRole, RouteGroup[]> = {} as Record<AppRole, RouteGroup[]>;
      
      EDITABLE_ROLES.forEach((role) => {
        const rolePerms = dbPermissions
          .filter((p) => p.role === role)
          .map((p) => p.permission_group as RouteGroup);
        
        // If no permissions exist for this role, use defaults
        if (rolePerms.length === 0) {
          grouped[role] = getDefaultPermissions(role);
        } else {
          grouped[role] = rolePerms;
        }
      });
      
      setLocalPermissions(grouped);
      setHasChanges(false);
    }
  }, [dbPermissions]);

  // Default permissions for each role
  function getDefaultPermissions(role: AppRole): RouteGroup[] {
    switch (role) {
      case "pastor":
        return ["dashboard", "members", "attendance", "ministries", "branches", "finances", "events", "reports", "communication", "settings"];
      case "treasurer":
        return ["dashboard", "finances", "reports"];
      case "secretary":
        return ["dashboard", "members", "attendance", "events", "communication"];
      case "volunteer":
        return ["dashboard", "attendance"];
      default:
        return ["dashboard"];
    }
  }

  // Save permissions mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant ID");

      // For each editable role, sync permissions
      for (const role of EDITABLE_ROLES) {
        const currentPerms = localPermissions[role] || [];
        const dbPerms = dbPermissions
          ?.filter((p) => p.role === role)
          .map((p) => p.permission_group as RouteGroup) || [];

        // Permissions to add
        const toAdd = currentPerms.filter((p) => !dbPerms.includes(p));
        // Permissions to remove
        const toRemove = dbPerms.filter((p) => !currentPerms.includes(p));

        // Add new permissions
        if (toAdd.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(toAdd.map((pg) => ({ role, permission_group: pg, tenant_id: tenantId })));
          if (error) throw error;
        }

        // Remove old permissions
        if (toRemove.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .delete()
            .eq("role", role)
            .eq("tenant_id", tenantId)
            .in("permission_group", toRemove);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-role-permissions", tenantId] });
      toast({
        title: t("common.save"),
        description: t("rolePermissions.saveSuccess"),
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("rolePermissions.saveError"),
        variant: "destructive",
      });
      console.error("Error saving permissions:", error);
    },
  });

  const togglePermission = (role: AppRole, group: RouteGroup) => {
    setLocalPermissions((prev) => {
      const rolePerms = prev[role] || [];
      const newPerms = rolePerms.includes(group)
        ? rolePerms.filter((p) => p !== group)
        : [...rolePerms, group];
      
      return { ...prev, [role]: newPerms };
    });
    setHasChanges(true);
  };

  const hasPermission = (role: AppRole, group: RouteGroup): boolean => {
    return localPermissions[role]?.includes(group) || false;
  };

  if (isLoading) {
    return <div className="text-muted-foreground">{t("rolePermissions.loadingPermissions")}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("rolePermissions.title")}
        </CardTitle>
        <CardDescription>
          {t("rolePermissions.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  {t("rolePermissions.feature")}
                </th>
                {EDITABLE_ROLES.map((role) => (
                  <th key={role} className="text-center py-3 px-2 font-medium text-muted-foreground">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSION_GROUPS.map((group) => (
                <tr key={group} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 font-medium">
                    {GROUP_LABELS[group]}
                  </td>
                  {EDITABLE_ROLES.map((role) => (
                    <td key={`${role}-${group}`} className="text-center py-3 px-2">
                      <Checkbox
                        checked={hasPermission(role, group)}
                        onCheckedChange={() => togglePermission(role, group)}
                        disabled={group === "dashboard"} // Dashboard always accessible
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("rolePermissions.dashboardAlwaysAccessible")}
          </p>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? t("rolePermissions.saving") : t("rolePermissions.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
