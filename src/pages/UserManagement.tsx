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
import { Users, Shield, Clock, CheckCircle, XCircle, Settings } from "lucide-react";
import RolePermissionsManager from "@/components/RolePermissionsManager";
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

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrateur",
  pastor: "Pasteur",
  treasurer: "Trésorier",
  secretary: "Secrétaire",
  volunteer: "Bénévole",
  user: "En attente",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  pastor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  treasurer: "bg-green-500/10 text-green-500 border-green-500/20",
  secretary: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  volunteer: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  user: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const APPROVED_ROLES: AppRole[] = ["admin", "pastor", "treasurer", "secretary", "volunteer"];

export default function UserManagement() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Record<string, AppRole>>({});

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, created_at");

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Get user emails from auth (we'll use a workaround through the profiles)
      const usersWithRoles: UserWithRoles[] = profiles.map((profile) => {
        const userRoles = allRoles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role);

        return {
          id: profile.id,
          email: "", // Will be populated if we can get it
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at || "",
          roles: userRoles.length > 0 ? userRoles : ["user" as AppRole],
        };
      });

      return usersWithRoles;
    },
  });

  // Mutation to assign a role
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First, remove the 'user' role if it exists and we're assigning a real role
      if (role !== "user") {
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "user");
      }

      // Check if the role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .single();

      if (existingRole) {
        throw new Error("Ce rôle est déjà assigné à cet utilisateur");
      }

      // Insert the new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Succès",
        description: "Rôle assigné avec succès",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to remove a role
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      // Check if user has any roles left
      const { data: remainingRoles } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId);

      // If no roles left, assign 'user' role (pending)
      if (!remainingRoles || remainingRoles.length === 0) {
        await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "user" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Succès",
        description: "Rôle retiré avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le rôle",
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les accès, les rôles et les permissions</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente d'Approbation</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{pendingUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilisateurs Approuvés</CardTitle>
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
                Utilisateurs en Attente d'Approbation
              </CardTitle>
              <CardDescription>
                Ces utilisateurs se sont inscrits mais n'ont pas encore accès au système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Date d'inscription</TableHead>
                    <TableHead>Assigner un Rôle</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedRole[user.id] || ""}
                          onValueChange={(value) =>
                            setSelectedRole((prev) => ({ ...prev, [user.id]: value as AppRole }))
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Choisir un rôle" />
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
                          Approuver
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
              Utilisateurs Approuvés
            </CardTitle>
            <CardDescription>
              Gérez les rôles des utilisateurs ayant accès au système
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : approvedUsers.length === 0 ? (
              <p className="text-muted-foreground">Aucun utilisateur approuvé</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôles Actuels</TableHead>
                    <TableHead>Ajouter un Rôle</TableHead>
                    <TableHead>Actions</TableHead>
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
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Ajouter un rôle" />
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
                          Ajouter
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <RolePermissionsManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
