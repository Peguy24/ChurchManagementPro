import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, UserPlus, CreditCard, Building2, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const categoryIcons: Record<string, React.ElementType> = {
  auth: UserPlus,
  subscription: CreditCard,
  tenant: Building2,
  user: Shield,
};

export function RecentActivityFeed() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "fr" ? "fr-FR" : language === "ht" ? "fr-HT" : "en-US";

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-recent-activity"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("platform_activity_logs")
        .select("id, event_type, event_category, description, user_email, created_at")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      return logs || [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("superAdmin.dashboard.recentActivity")}
          </span>
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/activity")}>
            {t("superAdmin.dashboard.viewAll")}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("superAdmin.dashboard.noActivity")}
          </p>
        ) : (
          <div className="space-y-2">
            {data?.map((log: any) => {
              const Icon = categoryIcons[log.event_category] || Activity;
              return (
                <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg text-sm hover:bg-muted/50 transition-colors">
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.user_email && <span>{log.user_email} · </span>}
                      {new Date(log.created_at).toLocaleDateString(dateLocale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
