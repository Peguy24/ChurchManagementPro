import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, AlertCircle } from "lucide-react";

export function PlatformAlertsWidget() {
  const { t } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-alerts-widget"],
    queryFn: async () => {
      const { data: notifications, error } = await supabase
        .from("platform_notifications")
        .select("id, title, severity, notification_type, is_read, created_at")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const unread = notifications?.filter((n) => !n.is_read).length || 0;

      return {
        alerts: notifications || [],
        unreadCount: unread,
      };
    },
  });

  const severityColor: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          {t("superAdmin.dashboard.alertsTitle")}
          {(data?.unreadCount || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">{data?.unreadCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : data?.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("superAdmin.dashboard.noAlerts")}
          </p>
        ) : (
          <div className="space-y-2">
            {data?.alerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`flex items-start gap-2 p-2 rounded-lg border text-sm ${!alert.is_read ? "bg-muted/50" : ""}`}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{alert.title}</p>
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-1 ${severityColor[alert.severity] || severityColor.info}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
