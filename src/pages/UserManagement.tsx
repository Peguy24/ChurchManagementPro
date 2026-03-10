import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users, Shield, Clock, CheckCircle, XCircle, UserPlus, UserCog } from "lucide-react";
import { PlatformInviteDialog } from "@/components/PlatformInviteDialog";
import { logPlatformActivity } from "@/lib/activityLogger";
import PlatformRolesManager from "@/components/PlatformRolesManager";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  roles: AppRole[];
}

// Only admin role can be assigned at the platform level - other roles are tenant-specific
const APPROVED_ROLES: AppRole[] = ["admin"];

export default function UserManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const ROLE_LABELS: Record<AppRole, string> = {
    admin: t("platform.roleSuperAdmin"),
    pastor: t("tenant.rolePastor"),
    treasurer: t("tenant.roleTreasurer"),
    secretary: t("tenant.roleSecretary"),
    volunteer: t("tenant.roleVolunteer"),
    user: t("platform.rolePending"),
  };

  const ROLE_COLORS: Record<AppRole, string> = {
    admin: "bg-red-500/10 text-red-500 border-red-500/20",
    pastor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    treasurer: "bg-green-500/10 text-green-500 border-green-500/20",
    secretary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    volunteer: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    user: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  // Fetch only platform-level users (those WITHOUT a tenant_id)
  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-users-with-roles"],
    queryFn: async () => {
      // Get profiles without tenant_id (platform-level users)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, created_at, tenant_id")
        .is("tenant_id", null);

      if (profilesError) throw profilesError;

      // Get all tenant_user_roles to exclude users who belong to a tenant
      const { data: tenantRoles } = await supabase
        .from("tenant_user_roles")
        .select("user_id");

      const tenantUserIds = new Set((tenantRoles || []).map(r => r.user_id));

      // Filter out users who have tenant roles (they belong to a church, not the platform)
      const platformProfiles = (profiles || []).filter(p => !tenantUserIds.has(p.id));

      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = platformProfiles.map((profile) => {
        const userRoles = allRoles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);

        return {
          id: profile.id,
          email: "",
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at || "",
          roles: userRoles.length > 0 ? userRoles : ["user" as AppRole],
        };
      });

      return usersWithRoles;
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (role !== "user") {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "user");
      }

      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (existingRole) {
        throw new Error(t("platform.roleAlreadyAssigned"));
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      logPlatformActivity({
        eventType: "role_changed",
        eventCategory: "user",
        description: `Rôle ${variables.role} attribué à l'utilisateur ${variables.userId.slice(0, 8)}`,
        metadata: { userId: variables.userId, role: variables.role },
      });
      toast({
        title: t("common.success") || "Success",
        description: t("platform.roleAssigned"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      const { data: remainingRoles } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId);

      if (!remainingRoles || remainingRoles.length === 0) {
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "user" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: t("common.success") || "Success",
        description: t("platform.roleRemoved"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("platform.removeRoleError"),
        variant: "destructive",
      });
    },
  });

  const handleAssignRole = (userId: string) => {
    const role = selectedRole[userId];
    if (role) {
      assignRoleMutation.mutate({ userId, role });
      setSelectedRole((prev) => ({ ...prev, [userId]: undefined as unknown as AppRole }));
    }
  };

  const pendingUsers = users?.filter((u) => 
    u.roles.length === 1 && u.roles[0] === "user"
  ) || [];

  const approvedUsers = users?.filter((u) => 
    u.roles.some((r) => APPROVED_ROLES.includes(r))
  ) || [];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("platform.superAdminManagement")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t("platform.superAdminManagementDesc")}</p>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            {t("platform.inviteSuperAdmin")}
          </Button>
        </div>

        <PlatformInviteDialog 
          open={isInviteDialogOpen} 
          onOpenChange={setIsInviteDialogOpen} 
        />

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("platform.usersTab")}
            </TabsTrigger>
            <TabsTrigger value="platform-roles" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              {t("platform.platformRolesTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("platform.totalUsers")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users?.length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("platform.pendingApproval")}</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">{pendingUsers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("platform.approvedUsers")}</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{approvedUsers.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Approval Section */}
            {pendingUsers.length > 0 && (
              <Card className="border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    {t("platform.usersPendingApproval")}
                  </CardTitle>
                  <CardDescription>
                    {t("platform.usersPendingApprovalDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("platform.registrationDate")}</TableHead>
                        <TableHead>{t("platform.assignRole")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={selectedRole[user.id] || ""}
                              onValueChange={(value) =>
                                setSelectedRole((prev) => ({ ...prev, [user.id]: value as AppRole }))
                              }
                            >
                              <SelectTrigger className="w-[140px] sm:w-[180px]">
                                <SelectValue placeholder={t("platform.chooseRole")} />
                              </SelectTrigger>
                              <SelectContent>
                                {APPROVED_ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleAssignRole(user.id)}
                              disabled={!selectedRole[user.id] || assignRoleMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              {t("tenant.approve")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Approved Users Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("platform.approvedUsersTitle")}
                </CardTitle>
                <CardDescription>
                  {t("platform.approvedUsersDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">{t("common.loading")}</p>
                ) : approvedUsers.length === 0 ? (
                  <p className="text-muted-foreground">{t("platform.noApprovedUsers")}</p>
                ) : (
                   <div className="overflow-x-auto"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("platform.currentRoles")}</TableHead>
                        <TableHead>{t("platform.addRole")}</TableHead>
                        <TableHead>{t("common.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.roles
                                .filter((r) => r !== "user")
                                .map((role) => (
                                  <Badge
                                    key={role}
                                    variant="outline"
                                    className={`${ROLE_COLORS[role]} cursor-pointer`}
                                    onClick={() => removeRoleMutation.mutate({ userId: user.id, role })}
                                  >
                                    {ROLE_LABELS[role]}
                                    <XCircle className="h-3 w-3 ml-1" />
                                  </Badge>
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={selectedRole[user.id] || ""}
                              onValueChange={(value) =>
                                setSelectedRole((prev) => ({ ...prev, [user.id]: value as AppRole }))
                              }
                            >
                              <SelectTrigger className="w-[140px] sm:w-[180px]">
                                <SelectValue placeholder={t("platform.addRole")} />
                              </SelectTrigger>
                              <SelectContent>
                                {APPROVED_ROLES.filter((r) => !user.roles.includes(r)).map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignRole(user.id)}
                              disabled={!selectedRole[user.id] || assignRoleMutation.isPending}
                            >
                              {t("common.add")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platform-roles">
            <PlatformRolesManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}