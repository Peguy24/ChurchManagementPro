import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { type RouteGroup } from "@/lib/permissions";

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
}

export default function RolePermissionsManager() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [localPermissions, setLocalPermissions] = useState<Record<AppRole, RouteGroup[]>>({} as Record<AppRole, RouteGroup[]>);
  const [hasChanges, setHasChanges] = useState(false);

  const roleLabels: Record<AppRole, string> = {
    admin: t("rolePermissions.roleAdmin"),
    pastor: t("rolePermissions.rolePastor"),
    treasurer: t("rolePermissions.roleTreasurer"),
    secretary: t("rolePermissions.roleSecretary"),
    volunteer: t("rolePermissions.roleVolunteer"),
    user: t("rolePermissions.roleUser"),
  };

  const groupLabels: Record<RouteGroup, string> = {
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
    volunteers: t("rolePermissions.groupVolunteers"),
    visitors: t("rolePermissions.groupVisitors"),
  };

  // Fetch current permissions from database
  const { data: dbPermissions, isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission_group");

      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Initialize local state from DB data
  useEffect(() => {
    if (dbPermissions) {
      const grouped: Record<AppRole, RouteGroup[]> = {} as Record<AppRole, RouteGroup[]>;
      
      EDITABLE_ROLES.forEach((role) => {
        grouped[role] = dbPermissions
          .filter((p) => p.role === role)
          .map((p) => p.permission_group as RouteGroup);
      });
      
      setLocalPermissions(grouped);
      setHasChanges(false);
    }
  }, [dbPermissions]);

  // Save permissions mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const role of EDITABLE_ROLES) {
        const currentPerms = localPermissions[role] || [];
        const dbPerms = dbPermissions
          ?.filter((p) => p.role === role)
          .map((p) => p.permission_group as RouteGroup) || [];

        const toAdd = currentPerms.filter((p) => !dbPerms.includes(p));
        const toRemove = dbPerms.filter((p) => !currentPerms.includes(p));

        if (toAdd.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .insert(toAdd.map((pg) => ({ role, permission_group: pg })));
          if (error) throw error;
        }

        if (toRemove.length > 0) {
          const { error } = await supabase
            .from("role_permissions")
            .delete()
            .eq("role", role)
            .in("permission_group", toRemove);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast({
        title: t("common.success"),
        description: t("rolePermissions.permissionsSaved"),
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: t("rolePermissions.permissionsSaveError"),
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
    return <div className="text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t("rolePermissions.title")}
        </CardTitle>
        <CardDescription>
          {t("rolePermissions.description")}
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
                    {roleLabels[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSION_GROUPS.map((group) => (
                <tr key={group} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2 font-medium">
                    {groupLabels[group]}
                  </td>
                  {EDITABLE_ROLES.map((role) => (
                    <td key={`${role}-${group}`} className="text-center py-3 px-2">
                      <Checkbox
                        checked={hasPermission(role, group)}
                        onCheckedChange={() => togglePermission(role, group)}
                        disabled={group === "dashboard"}
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
            {t("rolePermissions.dashboardNote")}
          </p>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
