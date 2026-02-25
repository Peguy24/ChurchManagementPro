import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Clock, Crown, Shield, Headphones } from "lucide-react";
import { format } from "date-fns";
import SupportDialog from "@/components/SupportDialog";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

function SupportTierBanner({ plan }: { plan: string | null }) {
  if (plan === "entreprise") {
    return (
      <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Headphones className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Support 24/7</h3>
              <Badge className="bg-primary text-primary-foreground">Entreprise</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Vous bénéficiez du support prioritaire 24h/24, 7j/7. Vos tickets sont traités en priorité absolue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (plan === "professionnel") {
    return (
      <Card className="border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 to-secondary/10">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-secondary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Support Prioritaire</h3>
              <Badge variant="secondary">Professionnel</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Vos tickets sont traités en priorité. Temps de réponse accéléré garanti.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-muted">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Support Email</h3>
            <Badge variant="outline">Essentiel</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Support par email standard. Passez au plan Professionnel pour un support prioritaire.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Support() {
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { plan } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["support-tickets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      open: t("layout.supportOpen"),
      in_progress: t("layout.supportInProgress"),
      resolved: t("layout.supportResolved"),
      closed: t("layout.supportClosed"),
    };
    return map[status] || status;
  };

  const getPriorityLabel = (p: string) => {
    const map: Record<string, string> = {
      low: t("layout.supportLow"),
      medium: t("layout.supportMedium"),
      high: t("layout.supportHigh"),
    };
    return map[p] || p;
  };

  const getCategoryLabel = (c: string) => {
    const map: Record<string, string> = {
      general: t("layout.supportGeneral"),
      billing: t("layout.supportBilling"),
      technical: t("layout.supportTechnical"),
      feature_request: t("layout.supportFeatureRequest"),
    };
    return map[c] || c;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("layout.support")}</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("layout.supportNewTicket")}
          </Button>
        </div>

        <SupportTierBanner plan={plan} />

        {isLoading ? (
          <div className="text-muted-foreground">{t("common.loading")}...</div>
        ) : !tickets?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("layout.supportNoTickets")}</h3>
              <p className="text-muted-foreground text-sm">{t("layout.supportNoTicketsDesc")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base">{ticket.subject}</CardTitle>
                    <div className="flex gap-2 flex-shrink-0">
                      <Badge className={priorityColors[ticket.priority] || ""} variant="secondary">
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                      <Badge className={statusColors[ticket.status] || ""} variant="secondary">
                        {getStatusLabel(ticket.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("layout.supportCreatedAt")} {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.message}</p>
                  {ticket.admin_response && (
                    <div className="bg-muted rounded-lg p-4 mt-3">
                      <p className="text-xs font-semibold text-primary mb-1">{t("layout.supportResponse")}</p>
                      <p className="text-sm whitespace-pre-wrap">{ticket.admin_response}</p>
                      {ticket.responded_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(ticket.responded_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SupportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        plan={plan}
        onSuccess={() => {
          refetch();
          toast({
            title: t("layout.supportTicketSent"),
            description: t("layout.supportTicketSentDesc"),
          });
        }}
      />
    </Layout>
  );
}
