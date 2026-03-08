import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SupportTicketsSummary() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-tickets-summary"],
    queryFn: async () => {
      const { data: tickets, error } = await supabase
        .from("support_tickets")
        .select("id, subject, priority, status, created_at, tenant_id");

      if (error) throw error;

      const open = tickets?.filter((t) => t.status === "open") || [];
      const inProgress = tickets?.filter((t) => t.status === "in_progress") || [];
      const urgent = open.filter((t) => t.priority === "high" || t.priority === "urgent");

      return {
        openCount: open.length,
        inProgressCount: inProgress.length,
        urgentCount: urgent.length,
        recentUrgent: urgent.slice(0, 3),
      };
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            {t("superAdmin.dashboard.supportTitle")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/support-management")}>
            {t("superAdmin.dashboard.viewAll")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-destructive">{data?.openCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t("superAdmin.dashboard.openTickets")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{data?.inProgressCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t("superAdmin.dashboard.inProgress")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{data?.urgentCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t("superAdmin.dashboard.urgent")}</p>
              </div>
            </div>

            {data?.recentUrgent && data.recentUrgent.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t("superAdmin.dashboard.urgentTickets")}
                </p>
                {data.recentUrgent.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between text-sm p-2 rounded-lg border">
                    <span className="truncate flex-1">{ticket.subject}</span>
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {ticket.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
