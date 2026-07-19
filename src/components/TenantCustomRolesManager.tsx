import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pencil, Plus, Save, Trash2, Users2 } from "lucide-react";
import type { RouteGroup } from "@/lib/permissions";

const ALL_PERMISSION_GROUPS: RouteGroup[] = [
  "dashboard", "members", "attendance", "attendance_admin", "ministries", "branches",
  "finances", "events", "reports", "communication", "settings",
  "inventory", "volunteers", "visitors",
  "website", "giving", "prayer_requests", "insights", "automations", "subscription",
];

interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface CustomRolePermission {
  id: string;
  custom_role_id: string;
  permission_group: string;
}

export default function TenantCustomRolesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<RouteGroup[]>(["dashboard"]);

  const GROUP_LABELS: Record<RouteGroup, string> = {
    dashboard: t("rolePermissions.groupDashboard"),
    members: t("rolePermissions.groupMembers"),
    attendance: t("rolePermissions.groupAttendance"),
    attendance_admin: t("rolePermissions.groupAttendanceAdmin"),
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
    website: t("rolePermissions.groupWebsite"),
    giving: t("rolePermissions.groupGiving"),
    prayer_requests: t("rolePermissions.groupPrayerRequests"),
    insights: t("rolePermissions.groupInsights"),
    automations: t("rolePermissions.groupAutomations"),
    subscription: t("rolePermissions.groupSubscription"),
  };

  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ["tenant-custom-roles", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("tenant_custom_roles")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data as CustomRole[];
    },
    enabled: !!tenantId,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["tenant-custom-role-permissions", tenantId],
    queryFn: async () => {
      if (!tenantId || customRoles.length === 0) return [];
      const roleIds = customRoles.map((r) => r.id);
      const { data, error } = await supabase
        .from("tenant_custom_role_permissions")
        .select("*")
        .in("custom_role_id", roleIds);
      if (error) throw error;
      return data as CustomRolePermission[];
    },
    enabled: !!tenantId && customRoles.length > 0,
  });

  // Count users assigned to each custom role
  const { data: userCounts = {} } = useQuery({
    queryKey: ["custom-role-user-counts", tenantId],
    queryFn: async () => {
      if (!tenantId || customRoles.length === 0) return {};
      const roleIds = customRoles.map((r) => r.id);
      const { data, error } = await supabase
        .from("tenant_user_roles")
        .select("custom_role_id")
        .eq("tenant_id", tenantId)
        .in("custom_role_id", roleIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        if (r.custom_role_id) {
          counts[r.custom_role_id] = (counts[r.custom_role_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!tenantId && customRoles.length > 0,
  });

  const getPermissionsForRole = (roleId: string): RouteGroup[] => {
    return allPermissions
      .filter((p) => p.custom_role_id === roleId)
      .map((p) => p.permission_group as RouteGroup);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !roleName.trim()) throw new Error("Missing data");

      if (editingRole) {
        // Update role
        const { error } = await supabase
          .from("tenant_custom_roles")
          .update({ name: roleName.trim(), description: roleDescription.trim() || null })
          .eq("id", editingRole.id);
        if (error) throw error;

        // Sync permissions: delete all then re-insert
        await supabase
          .from("tenant_custom_role_permissions")
          .delete()
          .eq("custom_role_id", editingRole.id);

        if (selectedPermissions.length > 0) {
          const { error: permError } = await supabase
            .from("tenant_custom_role_permissions")
            .insert(selectedPermissions.map((pg) => ({ custom_role_id: editingRole.id, permission_group: pg })));
          if (permError) throw permError;
        }
      } else {
        // Create role
        const { data: newRole, error } = await supabase
          .from("tenant_custom_roles")
          .insert({ tenant_id: tenantId, name: roleName.trim(), description: roleDescription.trim() || null })
          .select()
          .single();
        if (error) throw error;

        if (selectedPermissions.length > 0) {
          const { error: permError } = await supabase
            .from("tenant_custom_role_permissions")
            .insert(selectedPermissions.map((pg) => ({ custom_role_id: newRole.id, permission_group: pg })));
          if (permError) throw permError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-roles"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-role-permissions"] });
      toast({ title: t("common.save"), description: t("rolePermissions.saveSuccess") });
      closeDialog();
    },
    onError: (error: any) => {
      const isDuplicate = error?.message?.includes("duplicate") || error?.code === "23505";
      toast({
        title: t("common.error"),
        description: isDuplicate
          ? (t("customRoles.duplicateName") || "A role with this name already exists")
          : t("rolePermissions.saveError"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      // First unset custom_role_id for users with this role
      await supabase
        .from("tenant_user_roles")
        .update({ custom_role_id: null })
        .eq("custom_role_id", roleId);

      const { error } = await supabase
        .from("tenant_custom_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-roles"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-role-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["custom-role-user-counts"] });
      toast({ title: t("common.delete"), description: t("customRoles.deleted") || "Role deleted" });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("rolePermissions.saveError"), variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions(["dashboard"]);
    setDialogOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(getPermissionsForRole(role.id));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions(["dashboard"]);
  };

  const togglePermission = (group: RouteGroup) => {
    setSelectedPermissions((prev) =>
      prev.includes(group) ? prev.filter((p) => p !== group) : [...prev, group]
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                {t("customRoles.title") || "Custom Roles"}
              </CardTitle>
              <CardDescription>
                {t("customRoles.subtitle") || "Create custom roles with specific permissions for your church"}
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("customRoles.create") || "New Role"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("customRoles.empty") || "No custom roles yet. Create one to get started."}
            </div>
          ) : (
            <div className="space-y-3">
              {customRoles.map((role) => {
                const perms = getPermissionsForRole(role.id);
                const count = userCounts[role.id] || 0;
                return (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {count} {count === 1 ? (t("customRoles.user") || "user") : (t("customRoles.users") || "users")}
                          </Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {perms.map((p) => (
                          <Badge key={p} variant="outline" className="text-xs">
                            {GROUP_LABELS[p]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("customRoles.deleteTitle") || "Delete role"}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {count > 0
                                ? (t("customRoles.deleteWarningUsers") || `${count} user(s) are assigned to this role. They will lose their custom permissions.`)
                                : (t("customRoles.deleteConfirm") || "Are you sure you want to delete this role?")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(role.id)}
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRole
                ? (t("customRoles.edit") || "Edit Role")
                : (t("customRoles.create") || "New Role")}
            </DialogTitle>
            <DialogDescription>
              {t("customRoles.dialogDesc") || "Set the role name and choose which features this role can access."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("common.name")}</Label>
              <Input
                placeholder={t("customRoles.namePlaceholder") || "e.g. Youth Leader, Deacon"}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customRoles.description") || "Description"}</Label>
              <Input
                placeholder={t("customRoles.descPlaceholder") || "Optional description"}
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("customRoles.permissions") || "Permissions"}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-1">
                {ALL_PERMISSION_GROUPS.map((group) => (
                  <label
                    key={group}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedPermissions.includes(group)}
                      onCheckedChange={() => togglePermission(group)}
                    />
                    <span className="text-sm">{GROUP_LABELS[group]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!roleName.trim() || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? (t("rolePermissions.saving") || "Saving...") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
