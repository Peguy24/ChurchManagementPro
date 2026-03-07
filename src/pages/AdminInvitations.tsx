import { useState } from "react"; // Admin Invitations - translated
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
  const { t, language } = useLanguage();

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
      toast.success(t("platform.invitationRevoked"));
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
        },
      });
      
      if (error) throw error;
      toast.success(`${t("platform.emailResent")} ${invitation.email}`);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setResendingId(null);
    }
  };

  const getStatus = (invitation: AdminInvitation) => {
    if (invitation.used_at) {
      return { label: t("platform.statusUsed"), variant: "default" as const, icon: CheckCircle };
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: t("platform.statusExpired"), variant: "destructive" as const, icon: XCircle };
    }
    return { label: t("platform.statusPending"), variant: "secondary" as const, icon: Clock };
  };

  const copyInvitationLink = async (invitation: AdminInvitation) => {
    if (!invitation.tenant) return;
    
    const siteUrl = window.location.origin;
    const link = `${siteUrl}/t/${invitation.tenant.slug}/auth?invite=${invitation.token}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invitation.id);
      toast.success(t("platform.linkCopied"));
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error(t("platform.copyError"));
    }
  };

  const activeCount = invitations?.filter(inv => 
    !inv.used_at && new Date(inv.expires_at) >= new Date()
  ).length || 0;

  const usedCount = invitations?.filter(inv => inv.used_at).length || 0;
  const expiredCount = invitations?.filter(inv => 
    !inv.used_at && new Date(inv.expires_at) < new Date()
  ).length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("platform.adminInvitationsTitle")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">{t("platform.adminInvitationsDesc")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platform.pending")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{activeCount}</div>
              <p className="text-xs text-muted-foreground">{t("platform.activeInvitations")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platform.used")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{usedCount}</div>
              <p className="text-xs text-muted-foreground">{t("platform.adminAccountsCreated")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platform.expired")}</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{expiredCount}</div>
              <p className="text-xs text-muted-foreground">{t("platform.unusedExpired")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("platform.allInvitations")}
            </CardTitle>
            <CardDescription>{t("platform.invitationsHistory")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invitations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("platform.noInvitations")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("platform.emailAddress")}</TableHead>
                      <TableHead>{t("platform.church")}</TableHead>
                      <TableHead>{t("platform.status")}</TableHead>
                      <TableHead>{t("platform.created")}</TableHead>
                      <TableHead>{t("platform.expires")}</TableHead>
                      <TableHead className="text-right">{t("platform.actions")}</TableHead>
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
                              <p className="text-sm">
                                {format(new Date(invitation.created_at), "dd MMM yyyy", { locale: dateLocale })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true, locale: dateLocale })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {invitation.used_at ? (
                              <div>
                                <p className="text-sm text-green-600">{t("platform.statusUsed")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(invitation.used_at), "dd MMM yyyy", { locale: dateLocale })}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className={`text-sm ${new Date(invitation.expires_at) < new Date() ? 'text-destructive' : ''}`}>
                                  {format(new Date(invitation.expires_at), "dd MMM yyyy", { locale: dateLocale })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true, locale: dateLocale })}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isActive && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInvitationLink(invitation)}
                                    title={t("platform.copy")}
                                  >
                                    {copiedId === invitation.id ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                    <span className="ml-1 hidden sm:inline">{t("platform.copy")}</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resendInvitation(invitation)}
                                    disabled={resendingId === invitation.id}
                                  >
                                    {resendingId === invitation.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Send className="h-4 w-4" />
                                    )}
                                    <span className="ml-1 hidden sm:inline">{t("platform.resend")}</span>
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
                                    <AlertDialogTitle>{t("platform.deleteInvitation")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("platform.deleteInvitationDesc")} <strong>{invitation.email}</strong>.
                                      {isActive && ` ${t("platform.linkWontWork")}`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("platform.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(invitation.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {t("platform.delete")}
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
