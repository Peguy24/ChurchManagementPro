import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, XCircle, UserCog, Wallet, MessageSquare, HeadphonesIcon, TrendingUp } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type PlatformRole = Database["public"]["Enums"]["platform_role"];

interface PlatformUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  platform_roles: PlatformRole[];
  has_legacy_admin: boolean;
}

const PLATFORM_ROLE_ICONS: Record<PlatformRole, React.ReactNode> = {
  super_admin: <Shield className="h-3 w-3" />,
  finance_admin: <Wallet className="h-3 w-3" />,
  moderator: <MessageSquare className="h-3 w-3" />,
  support: <HeadphonesIcon className="h-3 w-3" />,
  sales: <TrendingUp className="h-3 w-3" />,
};

const PLATFORM_ROLE_COLORS: Record<PlatformRole, string> = {
  super_admin: "bg-red-500/10 text-red-500 border-red-500/20",
  finance_admin: "bg-green-500/10 text-green-500 border-green-500/20",
  moderator: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  support: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  sales: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const ASSIGNABLE_ROLES: PlatformRole[] = ["super_admin", "finance_admin", "moderator", "support", "sales"];

export default function PlatformRolesManager() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Record<string, PlatformRole>>({});

  const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
    super_admin: t("platform.roleSuperAdmin"),
    finance_admin: t("platform.roleFinanceAdmin"),
    moderator: t("platform.roleModerator"),
    support: t("platform.roleSupport"),
    sales: t("platform.roleSales"),
  };

  const PLATFORM_ROLE_DESCRIPTIONS: Record<PlatformRole, string> = {
    super_admin: t("platform.roleSuperAdminDesc"),
    finance_admin: t("platform.roleFinanceAdminDesc"),
    moderator: t("platform.roleModeratorDesc"),
    support: t("platform.roleSupportDesc"),
    sales: t("platform.roleSalesDesc"),
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-users-roles"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, created_at")
        .is("tenant_id", null);

      if (profilesError) throw profilesError;

      const { data: legacyRoles, error: legacyError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      if (legacyError) throw legacyError;

      const { data: platformRoles, error: platformError } = await supabase
        .from("platform_user_roles")
        .select("user_id, role");

      if (platformError) throw platformError;

      const usersWithRoles: PlatformUser[] = profiles.map((profile) => {
        const userPlatformRoles = platformRoles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);

        const hasLegacyAdmin = legacyRoles.some((r) => r.user_id === profile.id);

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at || "",
          platform_roles: userPlatformRoles,
          has_legacy_admin: hasLegacyAdmin,
        };
      });

      return usersWithRoles.filter(
        (u) => u.platform_roles.length > 0 || u.has_legacy_admin
      );
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: PlatformRole }) => {
      const { error } = await supabase
        .from("platform_user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users-roles"] });
      toast({
        title: t("common.success") || "Success",
        description: t("platform.platformRoleAssigned"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message.includes("duplicate")
          ? t("platform.roleAlreadyAssigned")
          : error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: PlatformRole }) => {
      const { error } = await supabase
        .from("platform_user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      if (role === "super_admin") {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
      }

      const { data: remainingRoles } = await supabase
        .from("platform_user_roles")
        .select("id")
        .eq("user_id", userId);

      if (!remainingRoles || remainingRoles.length === 0) {
        const { data: existingUserRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingUserRole) {
          await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: "user" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-users-roles"] });
      queryClient.invalidateQueries({ queryKey: ["platform-users-with-roles"] });
      toast({
        title: t("common.success") || "Success",
        description: t("platform.platformRoleRemoved"),
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
      setSelectedRole((prev) => ({ ...prev, [userId]: undefined as unknown as PlatformRole }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          {t("platform.platformRoles")}
        </CardTitle>
        <CardDescription>
          {t("platform.platformRolesDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Role Legend */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ASSIGNABLE_ROLES.map((role) => (
            <div
              key={role}
              className={`flex items-start gap-3 p-3 rounded-lg border ${PLATFORM_ROLE_COLORS[role]}`}
            >
              <div className="mt-0.5">{PLATFORM_ROLE_ICONS[role]}</div>
              <div>
                <p className="font-medium text-sm">{PLATFORM_ROLE_LABELS[role]}</p>
                <p className="text-xs opacity-80">{PLATFORM_ROLE_DESCRIPTIONS[role]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : !users || users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {t("platform.noPlatformUsers")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("platform.user")}</TableHead>
                <TableHead>{t("platform.currentRoles")}</TableHead>
                <TableHead>{t("platform.addRole")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.has_legacy_admin && (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-500 border-red-500/20"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Admin (Legacy)
                        </Badge>
                      )}
                      {user.platform_roles.map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className={`${PLATFORM_ROLE_COLORS[role]} cursor-pointer group`}
                          onClick={() => removeRoleMutation.mutate({ userId: user.id, role })}
                        >
                          {PLATFORM_ROLE_ICONS[role]}
                          <span className="ml-1">{PLATFORM_ROLE_LABELS[role]}</span>
                          <XCircle className="h-3 w-3 ml-1 opacity-50 group-hover:opacity-100" />
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={selectedRole[user.id] || ""}
                      onValueChange={(value) =>
                        setSelectedRole((prev) => ({ ...prev, [user.id]: value as PlatformRole }))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t("platform.addRole")} />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.filter((r) => !user.platform_roles.includes(r)).map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {PLATFORM_ROLE_ICONS[role]}
                              {PLATFORM_ROLE_LABELS[role]}
                            </div>
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
          </Table>
        )}
      </CardContent>
    </Card>
  );
}