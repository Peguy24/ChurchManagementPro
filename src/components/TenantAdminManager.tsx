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
import { fr, enUS } from "date-fns/locale";
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
import { useLanguage } from "@/contexts/LanguageContext";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    adminsOf: "Administrators of",
    manageAdmins: "Manage the administrators of this church. You can remove them or send them an email.",
    administrator: "Administrator",
    email: "Email",
    status: "Status",
    since: "Since",
    actions: "Actions",
    approved: "Approved",
    pending: "Pending",
    sendEmail: "Send an email",
    deleteAdmin: "Delete this admin",
    noAdmins: "No administrator configured",
    noAdminsDesc: "This church does not have an administrator yet.",
    inviteNewAdmin: "Invite a new admin",
    generateShareLink: "Generate a shareable invitation link",
    generateLink: "Generate a link",
    linkExpires: "This link expires in 7 days and can only be used once.",
    linkCopied: "Link copied to clipboard",
    confirmDelete: "Confirm deletion",
    confirmDeleteDesc: "Are you sure you want to remove",
    deleteWarning: "? This action is irreversible. The user will lose all access to this church.",
    cancel: "Cancel",
    delete: "Delete",
    adminRemoved: "removed successfully",
    error: "Error",
    sendEmailTitle: "Send an email",
    sendEmailTo: "Send an email to",
    theAdmin: "the administrator",
    subject: "Subject",
    subjectPlaceholder: "Email subject",
    message: "Message",
    messagePlaceholder: "Your message...",
    send: "Send",
    emailSentTo: "Email sent to",
    sendError: "Error sending",
    importantInfo: "Important information",
    hello: "Hello",
    emailNotAvailable: "Email unavailable",
    defaultAdminName: "Admin",
  fr: {
    adminsOf: "Administrateurs de",
    manageAdmins: "Gérez les administrateurs de cette église. Vous pouvez les supprimer ou leur envoyer un email.",
    administrator: "Administrateur",
    email: "Email",
    status: "Statut",
    since: "Depuis",
    actions: "Actions",
    approved: "Approuvé",
    pending: "En attente",
    sendEmail: "Envoyer un email",
    deleteAdmin: "Supprimer cet admin",
    noAdmins: "Aucun administrateur configuré",
    noAdminsDesc: "Cette église n'a pas encore d'administrateur.",
    inviteNewAdmin: "Inviter un nouvel admin",
    generateShareLink: "Générez un lien d'invitation à partager",
    generateLink: "Générer un lien",
    linkExpires: "Ce lien expire dans 7 jours et ne peut être utilisé qu'une seule fois.",
    linkCopied: "Lien copié dans le presse-papier",
    confirmDelete: "Confirmer la suppression",
    confirmDeleteDesc: "Êtes-vous sûr de vouloir supprimer",
    deleteWarning: " ? Cette action est irréversible. L'utilisateur perdra tous ses accès à cette église.",
    cancel: "Annuler",
    delete: "Supprimer",
    adminRemoved: "retiré avec succès",
    error: "Erreur",
    sendEmailTitle: "Envoyer un email",
    sendEmailTo: "Envoyez un email à",
    theAdmin: "l'administrateur",
    subject: "Sujet",
    subjectPlaceholder: "Sujet de l'email",
    message: "Message",
    messagePlaceholder: "Votre message...",
    send: "Envoyer",
    emailSentTo: "Email envoyé à",
    sendError: "Erreur lors de l'envoi",
    importantInfo: "Information importante",
    hello: "Bonjour",
    emailNotAvailable: "Email non disponible",
    defaultAdminName: "Administrateur",
  ht: {
    adminsOf: "Administratè pou",
    manageAdmins: "Jere administratè legliz sa a. Ou ka retire yo oswa voye yo yon imèl.",
    administrator: "Administratè",
    email: "Imèl",
    status: "Estati",
    since: "Depi",
    actions: "Aksyon",
    approved: "Apwouve",
    pending: "An atant",
    sendEmail: "Voye yon imèl",
    deleteAdmin: "Efase administratè sa a",
    noAdmins: "Pa gen administratè konfigire",
    noAdminsDesc: "Legliz sa a poko gen administratè.",
    inviteNewAdmin: "Envite yon nouvo admin",
    generateShareLink: "Jenere yon lyen envitasyon pou pataje",
    generateLink: "Jenere yon lyen",
    linkExpires: "Lyen sa a ekspire nan 7 jou e li ka itilize yon sèl fwa.",
    linkCopied: "Lyen kopye nan pres-papye",
    confirmDelete: "Konfime sipresyon",
    confirmDeleteDesc: "Èske ou sèten ou vle retire",
    deleteWarning: " ? Aksyon sa a pa ka anile. Itilizatè a ap pèdi tout aksè li nan legliz sa a.",
    cancel: "Anile",
    delete: "Efase",
    adminRemoved: "retire avèk siksè",
    error: "Erè",
    sendEmailTitle: "Voye yon imèl",
    sendEmailTo: "Voye yon imèl bay",
    theAdmin: "administratè a",
    subject: "Sijè",
    subjectPlaceholder: "Sijè imèl la",
    message: "Mesaj",
    messagePlaceholder: "Mesaj ou...",
    send: "Voye",
    emailSentTo: "Imèl voye bay",
    sendError: "Erè nan anvwa",
    importantInfo: "Enfòmasyon enpòtan",
    hello: "Bonjou",
    emailNotAvailable: "Imèl pa disponib",
    defaultAdminName: "Administratè",
  },
};

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
  const { language } = useLanguage();
  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;
  const dateLocale = language === "fr" ? fr : language === "ht" ? fr : enUS;

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

      const { data: adminRoles, error: rolesError } = await supabase
        .from("tenant_user_roles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("role", "admin");

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map((r) => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const { data: invitations } = await supabase
        .from("admin_invitations")
        .select("email, used_at")
        .eq("tenant_id", tenant.id)
        .not("used_at", "is", null);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const usedInvitations = invitations || [];

      const adminsWithInfo: TenantAdmin[] = adminRoles.map((role) => {
        const profile = profileMap.get(role.user_id);
        const matchingInvitation = usedInvitations.find(() => true);

        return {
          id: role.id,
          user_id: role.user_id,
          tenant_id: role.tenant_id,
          role: role.role,
          is_approved: role.is_approved,
          created_at: role.created_at,
          user_email: matchingInvitation?.email || lt("emailNotAvailable"),
          user_first_name: profile?.first_name || null,
          user_last_name: profile?.last_name || null,
        };
      });

      return adminsWithInfo;
    },
    enabled: open && !!tenant?.id,
  });

  const { data: adminEmails } = useQuery({
    queryKey: ["tenant-admin-emails", tenant?.id, admins?.map((a) => a.user_id)],
    queryFn: async () => {
      if (!admins || admins.length === 0) return {};

      const { data: usedInvitations } = await supabase
        .from("admin_invitations")
        .select("email, created_at, used_at")
        .eq("tenant_id", tenant?.id)
        .not("used_at", "is", null)
        .order("used_at", { ascending: true });

      const emailMap: Record<string, string> = {};

      if (usedInvitations && admins) {
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
      const { error } = await supabase
        .from("tenant_user_roles")
        .delete()
        .eq("id", admin.id);

      if (error) throw error;

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
      toast.success(`Admin ${admin.user_first_name || ""} ${lt("adminRemoved")}`);
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    },
    onError: (error) => {
      toast.error(`${lt("error")}: ${error.message}`);
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
      toast.success(`${lt("emailSentTo")} ${email}`);
      setEmailDialogOpen(false);
      setSelectedAdminForEmail(null);
      setEmailSubject("");
      setEmailMessage("");
    },
    onError: (error) => {
      toast.error(`${lt("sendError")}: ${error.message}`);
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
      toast.error(`${lt("error")}: ${error.message}`);
    },
  });

  const handleDeleteClick = (admin: TenantAdmin) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const handleEmailClick = (admin: TenantAdmin) => {
    setSelectedAdminForEmail(admin);
    setEmailSubject(`${lt("importantInfo")} - ${tenant?.name}`);
    setEmailMessage(`${lt("hello")}${admin.user_first_name ? ` ${admin.user_first_name}` : ""},\n\n`);
    setEmailDialogOpen(true);
  };

  const copyToClipboard = async () => {
    if (invitationLink) {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast.success(lt("linkCopied"));
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
    return lt("defaultAdminName");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {lt("adminsOf")} {tenant?.name}
            </DialogTitle>
            <DialogDescription>
              {lt("manageAdmins")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : admins && admins.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt("administrator")}</TableHead>
                      <TableHead>{lt("email")}</TableHead>
                      <TableHead>{lt("status")}</TableHead>
                      <TableHead>{lt("since")}</TableHead>
                      <TableHead className="text-right">{lt("actions")}</TableHead>
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
                            <Badge variant="default">{lt("approved")}</Badge>
                          ) : (
                            <Badge variant="secondary">{lt("pending")}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(admin.created_at), "dd MMM yyyy", { locale: dateLocale })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEmailClick(admin)}
                              title={lt("sendEmail")}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(admin)}
                              title={lt("deleteAdmin")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{lt("noAdmins")}</p>
                <p className="text-sm">{lt("noAdminsDesc")}</p>
              </div>
            )}

            {/* Generate invite link section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{lt("inviteNewAdmin")}</p>
                  <p className="text-xs text-muted-foreground">
                    {lt("generateShareLink")}
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
                  {lt("generateLink")}
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
                    {lt("linkExpires")}
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
            <AlertDialogTitle>{lt("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {lt("confirmDeleteDesc")} {adminToDelete ? getAdminName(adminToDelete) : lt("theAdmin")}{lt("deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lt("cancel")}</AlertDialogCancel>
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
              {lt("delete")}
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
              {lt("sendEmailTitle")}
            </DialogTitle>
            <DialogDescription>
              {lt("sendEmailTo")} {selectedAdminForEmail ? getAdminEmail(selectedAdminForEmail) : lt("theAdmin")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject">{lt("subject")}</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={lt("subjectPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">{lt("message")}</Label>
              <textarea
                id="email-message"
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder={lt("messagePlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                {lt("cancel")}
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
                {lt("send")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
