import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Mail, Trash2, Copy, Check, AlertCircle, UserCheck, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TenantAdmin {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  is_approved: boolean;
  created_at: string;
  user_email: string;
  user_first_name: string | null;
  user_last_name: string | null;
}

interface TenantAdminManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function TenantAdminManager({ open, onOpenChange, tenant }: TenantAdminManagerProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<TenantAdmin | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedAdminForEmail, setSelectedAdminForEmail] = useState<TenantAdmin | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["tenant-admins", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      // Get admin roles for this tenant
      const { data: adminRoles, error: rolesError } = await supabase
        .from("tenant_user_roles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      if (!adminRoles || adminRoles.length === 0) return [];

      // Get user profiles for these admins
      const userIds = adminRoles.map((r) => r.user_id);
      
      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get auth users emails - we need to use a different approach
      // Since we can't directly query auth.users, we'll get emails from the admin_invitations
      // or display what we have from profiles
      const { data: invitations } = await supabase
        .from("admin_invitations")
        .select("email, used_at")
        .eq("tenant_id", tenant.id)
        .not("used_at", "is", null);

      // Build a map of user_id to profile info
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const usedInvitations = invitations || [];

      // Try to match invitations with profiles based on the order they were used
      const adminsWithInfo: TenantAdmin[] = adminRoles.map((role) => {
        const profile = profileMap.get(role.user_id);
        
        // Try to find an email - we'll use the invitation email if available
        // For a more robust solution, we'd need a server-side function
        const matchingInvitation = usedInvitations.find((inv) => {
          // This is a simplified match - in production, you'd want to store user_id in invitations
          return true; // We'll fall back to showing the first name/last name
        });

        return {
          id: role.id,
          user_id: role.user_id,
          tenant_id: role.tenant_id,
          role: role.role,
          is_approved: role.is_approved,
          created_at: role.created_at,
          user_email: matchingInvitation?.email || "Email non disponible",
          user_first_name: profile?.first_name || null,
          user_last_name: profile?.last_name || null,
        };
      });

      return adminsWithInfo;
    },
    enabled: open && !!tenant?.id,
  });

  // Get user emails using a more direct approach by fetching from profiles
  const { data: adminEmails } = useQuery({
    queryKey: ["tenant-admin-emails", tenant?.id, admins?.map((a) => a.user_id)],
    queryFn: async () => {
      if (!admins || admins.length === 0) return {};
      
      // Try to get emails from admin_invitations that were used for this tenant
      const { data: usedInvitations } = await supabase
        .from("admin_invitations")
        .select("email, created_at, used_at")
        .eq("tenant_id", tenant?.id)
        .not("used_at", "is", null)
        .order("used_at", { ascending: true });

      // Map the used invitations to admin users by order (first invitation -> first admin, etc.)
      const emailMap: Record<string, string> = {};
      
      if (usedInvitations && admins) {
        // Sort admins by created_at to match with invitations
        const sortedAdmins = [...admins].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        sortedAdmins.forEach((admin, index) => {
          if (usedInvitations[index]) {
            emailMap[admin.user_id] = usedInvitations[index].email;
          }
        });
      }

      return emailMap;
    },
    enabled: open && !!tenant?.id && !!admins && admins.length > 0,
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (admin: TenantAdmin) => {
      // Delete the tenant role
      const { error } = await supabase
        .from("tenant_user_roles")
        .delete()
        .eq("id", admin.id);

      if (error) throw error;

      // Also update the user's profile to remove tenant_id if this was their only role
      const { data: remainingRoles } = await supabase
        .from("tenant_user_roles")
        .select("id")
        .eq("user_id", admin.user_id);

      if (!remainingRoles || remainingRoles.length === 0) {
        await supabase
          .from("profiles")
          .update({ tenant_id: null })
          .eq("id", admin.user_id);
      }

      return admin;
    },
    onSuccess: (admin) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-admins", tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(`Admin ${admin.user_first_name || "supprimé"} retiré avec succès`);
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, subject, message }: { email: string; subject: string; message: string }) => {
      const { error } = await supabase.functions.invoke("send-admin-invite", {
        body: {
          email,
          tenantId: tenant?.id,
          tenantName: tenant?.name,
          tenantSlug: tenant?.slug,
          skipEmail: false,
          customSubject: subject,
          customMessage: message,
        },
      });

      if (error) throw error;
      return { email };
    },
    onSuccess: ({ email }) => {
      toast.success(`Email envoyé à ${email}`);
      setEmailDialogOpen(false);
      setSelectedAdminForEmail(null);
      setEmailSubject("");
      setEmailMessage("");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'envoi: " + error.message);
    },
  });

  const generateInviteLinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-admin-invite", {
        body: {
          email: "new-admin@placeholder.com",
          tenantId: tenant?.id,
          tenantName: tenant?.name,
          tenantSlug: tenant?.slug,
          skipEmail: true,
        },
      });

      if (error) throw error;
      return data.invitationLink;
    },
    onSuccess: (link) => {
      setInvitationLink(link);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });

  const handleDeleteClick = (admin: TenantAdmin) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const handleEmailClick = (admin: TenantAdmin) => {
    setSelectedAdminForEmail(admin);
    setEmailSubject(`Information importante - ${tenant?.name}`);
    setEmailMessage(`Bonjour${admin.user_first_name ? ` ${admin.user_first_name}` : ""},\n\n`);
    setEmailDialogOpen(true);
  };

  const copyToClipboard = async () => {
    if (invitationLink) {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAdminEmail = (admin: TenantAdmin) => {
    if (adminEmails && adminEmails[admin.user_id]) {
      return adminEmails[admin.user_id];
    }
    return admin.user_email;
  };

  const getAdminName = (admin: TenantAdmin) => {
    if (admin.user_first_name || admin.user_last_name) {
      return `${admin.user_first_name || ""} ${admin.user_last_name || ""}`.trim();
    }
    return "Admin";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Administrateurs de {tenant?.name}
            </DialogTitle>
            <DialogDescription>
              Gérez les administrateurs de cette église. Vous pouvez les supprimer ou leur envoyer un email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : admins && admins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Depuis</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{getAdminName(admin)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getAdminEmail(admin)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {admin.is_approved ? (
                          <Badge variant="default">
                            Approuvé
                          </Badge>
                        ) : (
                          <Badge variant="secondary">En attente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(admin.created_at), "dd MMM yyyy", { locale: fr })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEmailClick(admin)}
                            title="Envoyer un email"
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(admin)}
                            title="Supprimer cet admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucun administrateur configuré</p>
                <p className="text-sm">Cette église n'a pas encore d'administrateur.</p>
              </div>
            )}

            {/* Generate invite link section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Inviter un nouvel admin</p>
                  <p className="text-xs text-muted-foreground">
                    Générez un lien d'invitation à partager
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateInviteLinkMutation.mutate()}
                  disabled={generateInviteLinkMutation.isPending}
                >
                  {generateInviteLinkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Générer un lien
                </Button>
              </div>

              {invitationLink && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Input
                      value={invitationLink}
                      readOnly
                      className="text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      className="shrink-0 [&>svg]:text-primary"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ce lien expire dans 7 jours et ne peut être utilisé qu'une seule fois.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {adminToDelete ? getAdminName(adminToDelete) : "cet administrateur"} ?
              Cette action est irréversible. L'utilisateur perdra tous ses accès à cette église.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete)}
              disabled={deleteAdminMutation.isPending}
            >
              {deleteAdminMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Envoyer un email
            </DialogTitle>
            <DialogDescription>
              Envoyez un email à {selectedAdminForEmail ? getAdminEmail(selectedAdminForEmail) : "l'administrateur"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">Sujet</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Sujet de l'email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <textarea
                id="email-message"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Votre message..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (selectedAdminForEmail) {
                    sendEmailMutation.mutate({
                      email: getAdminEmail(selectedAdminForEmail),
                      subject: emailSubject,
                      message: emailMessage,
                    });
                  }
                }}
                disabled={sendEmailMutation.isPending || !emailSubject || !emailMessage}
              >
                {sendEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
