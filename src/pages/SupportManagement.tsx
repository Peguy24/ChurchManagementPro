import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { logPlatformActivity } from "@/lib/activityLogger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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

export default function SupportManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [responses, setResponses] = useState<Record<string, string>>({});

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["all-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ ticketId, response, newStatus }: { ticketId: string; response: string; newStatus: string }) => {
      const res = await supabase.functions.invoke("send-support-email", {
        body: { action: "respond_ticket", ticketId, response, newStatus },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-support-tickets"] });
      setResponses((prev) => {
        const next = { ...prev };
        delete next[variables.ticketId];
        return next;
      });
      toast({
        title: t("layout.supportResponseSent"),
        description: t("layout.supportResponseSentDesc"),
      });
    },
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

  const filteredTickets = tickets?.filter((t) => statusFilter === "all" || t.status === statusFilter) || [];

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold">{t("layout.supportManagement")}</h1>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all") || "Tous"}</SelectItem>
              <SelectItem value="open">{t("layout.supportOpen")}</SelectItem>
              <SelectItem value="in_progress">{t("layout.supportInProgress")}</SelectItem>
              <SelectItem value="resolved">{t("layout.supportResolved")}</SelectItem>
              <SelectItem value="closed">{t("layout.supportClosed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground">{t("common.loading")}...</div>
        ) : !filteredTickets.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("layout.supportNoTickets")}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{ticket.subject}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(ticket as any).tenants?.name || "—"}
                      </p>
                    </div>
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
                      {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>

                  {ticket.admin_response && (
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-xs font-semibold text-primary mb-1">{t("layout.supportResponse")}</p>
                      <p className="text-sm whitespace-pre-wrap">{ticket.admin_response}</p>
                    </div>
                  )}

                  {ticket.status !== "closed" && (
                    <div className="border-t pt-3 space-y-2">
                      <Textarea
                        placeholder={t("layout.supportRespond") + "..."}
                        value={responses[ticket.id] || ""}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        {ticket.status === "open" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => respondMutation.mutate({
                              ticketId: ticket.id,
                              response: responses[ticket.id] || "",
                              newStatus: "in_progress",
                            })}
                            disabled={respondMutation.isPending}
                          >
                            {t("layout.supportInProgress")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => respondMutation.mutate({
                            ticketId: ticket.id,
                            response: responses[ticket.id] || "",
                            newStatus: "resolved",
                          })}
                          disabled={respondMutation.isPending}
                        >
                          {t("layout.supportResolved")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respondMutation.mutate({
                            ticketId: ticket.id,
                            response: responses[ticket.id] || "",
                            newStatus: ticket.status === "resolved" ? "closed" : "resolved",
                          })}
                          disabled={!responses[ticket.id]?.trim() || respondMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {t("layout.supportRespond")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
