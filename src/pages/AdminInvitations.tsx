import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Mail, Trash2, RefreshCw, Clock, CheckCircle, XCircle, Send, Shield, Copy, Check } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "Admin Invitations",
    desc: "Manage church administrator invitations",
    pending: "Pending",
    used: "Used",
    expired: "Expired",
    activeInvitations: "Active unused invitations",
    adminAccountsCreated: "Admin accounts created",
    unusedExpired: "Invitations not used in time",
    allInvitations: "All Invitations",
    invitationsHistory: "Complete history of administrator invitations",
    email: "Email",
    church: "Church",
    status: "Status",
    created: "Created",
    expires: "Expires",
    actions: "Actions",
    statusUsed: "Used",
    statusExpired: "Expired",
    statusPending: "Pending",
    copy: "Copy",
    resend: "Resend",
    deleteInvitation: "Delete invitation?",
    deleteInvitationDesc: "This will permanently delete the invitation for",
    linkWontWork: "The invitation link will no longer work.",
    cancel: "Cancel",
    delete: "Delete",
    invitationRevoked: "Invitation revoked",
    emailResent: "Email resent to",
    linkCopied: "Link copied to clipboard",
    copyError: "Unable to copy link",
    noInvitations: "No invitations sent",
  },
  fr: {
    title: "Invitations Administrateurs",
    desc: "Gérez les invitations d'administrateurs d'église",
    pending: "En attente",
    used: "Utilisées",
    expired: "Expirées",
    activeInvitations: "Invitations actives non utilisées",
    adminAccountsCreated: "Comptes admin créés",
    unusedExpired: "Invitations non utilisées à temps",
    allInvitations: "Toutes les invitations",
    invitationsHistory: "Historique complet des invitations d'administrateurs",
    email: "Email",
    church: "Église",
    status: "Statut",
    created: "Créée",
    expires: "Expire",
    actions: "Actions",
    statusUsed: "Utilisée",
    statusExpired: "Expirée",
    statusPending: "En attente",
    copy: "Copier",
    resend: "Renvoyer",
    deleteInvitation: "Supprimer l'invitation ?",
    deleteInvitationDesc: "Cette action supprimera définitivement l'invitation pour",
    linkWontWork: "Le lien d'invitation ne fonctionnera plus.",
    cancel: "Annuler",
    delete: "Supprimer",
    invitationRevoked: "Invitation révoquée",
    emailResent: "Email renvoyé à",
    linkCopied: "Lien copié dans le presse-papiers",
    copyError: "Impossible de copier le lien",
    noInvitations: "Aucune invitation envoyée",
  },
  ht: {
    title: "Envitasyon Administratè",
    desc: "Jere envitasyon administratè legliz",
    pending: "An atant",
    used: "Itilize",
    expired: "Ekspire",
    activeInvitations: "Envitasyon aktif ki pa itilize",
    adminAccountsCreated: "Kont admin kreye",
    unusedExpired: "Envitasyon ki pa itilize a tan",
    allInvitations: "Tout Envitasyon",
    invitationsHistory: "Istwa konplè envitasyon administratè",
    email: "Imèl",
    church: "Legliz",
    status: "Estati",
    created: "Kreye",
    expires: "Ekspire",
    actions: "Aksyon",
    statusUsed: "Itilize",
    statusExpired: "Ekspire",
    statusPending: "An atant",
    copy: "Kopye",
    resend: "Revoye",
    deleteInvitation: "Efase envitasyon?",
    deleteInvitationDesc: "Sa ap efase envitasyon pou",
    linkWontWork: "Lyen envitasyon an pa p fonksyone ankò.",
    cancel: "Anile",
    delete: "Efase",
    invitationRevoked: "Envitasyon revoke",
    emailResent: "Imèl revoye bay",
    linkCopied: "Lyen kopye nan pres-papye",
    copyError: "Enposib kopye lyen",
    noInvitations: "Pa gen envitasyon voye",
  },
};

interface AdminInvitation {
  id: string;
  email: string;
  token: string;
  tenant_id: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminInvitations() {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { language } = useLanguage();

  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;
  const dateLocale = language === "fr" ? fr : language === "ht" ? fr : enUS;

  const { data: invitations, isLoading } = useQuery({
    queryKey: ["admin-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select(`id, email, token, tenant_id, expires_at, used_at, created_at`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const tenantIds = [...new Set(data?.map(inv => inv.tenant_id) || [])];
      const { data: tenants } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .in("id", tenantIds);

      const tenantMap = new Map(tenants?.map(t => [t.id, t]) || []);

      return (data || []).map(inv => ({
        ...inv,
        tenant: tenantMap.get(inv.tenant_id)
      })) as AdminInvitation[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-invitations"] });
      toast.success(lt("invitationRevoked"));
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });

  const resendInvitation = async (invitation: AdminInvitation) => {
    if (!invitation.tenant) return;
    setResendingId(invitation.id);
    try {
      const { error } = await supabase.functions.invoke('send-admin-invite', {
        body: {
          email: invitation.email,
          tenantId: invitation.tenant_id,
          tenantName: invitation.tenant.name,
          tenantSlug: invitation.tenant.slug,
          language,
        },
      });
      if (error) throw error;
      toast.success(`${lt("emailResent")} ${invitation.email}`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setResendingId(null);
    }
  };

  const getStatus = (invitation: AdminInvitation) => {
    if (invitation.used_at) return { label: lt("statusUsed"), variant: "default" as const, icon: CheckCircle };
    if (new Date(invitation.expires_at) < new Date()) return { label: lt("statusExpired"), variant: "destructive" as const, icon: XCircle };
    return { label: lt("statusPending"), variant: "secondary" as const, icon: Clock };
  };

  const copyInvitationLink = async (invitation: AdminInvitation) => {
    if (!invitation.tenant) return;
    const link = `${window.location.origin}/t/${invitation.tenant.slug}/auth?invite=${invitation.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitation.id);
      toast.success(lt("linkCopied"));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(lt("copyError"));
    }
  };

  const activeCount = invitations?.filter(inv => !inv.used_at && new Date(inv.expires_at) >= new Date()).length || 0;
  const usedCount = invitations?.filter(inv => inv.used_at).length || 0;
  const expiredCount = invitations?.filter(inv => !inv.used_at && new Date(inv.expires_at) < new Date()).length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{lt("title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{lt("desc")}</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{lt("pending")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground">{lt("activeInvitations")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{lt("used")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usedCount}</div>
              <p className="text-xs text-muted-foreground">{lt("adminAccountsCreated")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{lt("expired")}</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
              <p className="text-xs text-muted-foreground">{lt("unusedExpired")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {lt("allInvitations")}
            </CardTitle>
            <CardDescription>{lt("invitationsHistory")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invitations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{lt("noInvitations")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt("email")}</TableHead>
                      <TableHead>{lt("church")}</TableHead>
                      <TableHead>{lt("status")}</TableHead>
                      <TableHead>{lt("created")}</TableHead>
                      <TableHead>{lt("expires")}</TableHead>
                      <TableHead className="text-right">{lt("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations?.map((invitation) => {
                      const status = getStatus(invitation);
                      const StatusIcon = status.icon;
                      const isActive = !invitation.used_at && new Date(invitation.expires_at) >= new Date();

                      return (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{invitation.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invitation.tenant ? (
                              <div>
                                <p className="font-medium">{invitation.tenant.name}</p>
                                <p className="text-xs text-muted-foreground">/{invitation.tenant.slug}</p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{format(new Date(invitation.created_at), "dd MMM yyyy", { locale: dateLocale })}</p>
                              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: dateLocale })}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invitation.used_at ? (
                              <div>
                                <p className="text-sm text-green-600">{lt("statusUsed")}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(invitation.used_at), "dd MMM yyyy", { locale: dateLocale })}</p>
                              </div>
                            ) : (
                              <div>
                                <p className={`text-sm ${new Date(invitation.expires_at) < new Date() ? 'text-destructive' : ''}`}>
                                  {format(new Date(invitation.expires_at), "dd MMM yyyy", { locale: dateLocale })}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true, locale: dateLocale })}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isActive && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => copyInvitationLink(invitation)} title={lt("copy")}>
                                    {copiedId === invitation.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                    <span className="ml-1 hidden sm:inline">{lt("copy")}</span>
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => resendInvitation(invitation)} disabled={resendingId === invitation.id}>
                                    {resendingId === invitation.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    <span className="ml-1 hidden sm:inline">{lt("resend")}</span>
                                  </Button>
                                </>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{lt("deleteInvitation")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {lt("deleteInvitationDesc")} <strong>{invitation.email}</strong>.
                                      {isActive && ` ${lt("linkWontWork")}`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{lt("cancel")}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(invitation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {lt("delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
