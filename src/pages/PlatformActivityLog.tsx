import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity, Download, Search, UserPlus, Building2, CreditCard, 
  Shield, MessageSquare, Clock, ChevronDown, Filter 
} from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { exportToCsv, formatDateForCsv } from "@/lib/csvExport";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  auth: UserPlus,
  subscription: CreditCard,
  tenant: Building2,
  user: Shield,
  support: MessageSquare,
  general: Activity,
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  subscription: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  tenant: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  user: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  support: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  general: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 50;

export default function PlatformActivityLog() {
  const { t } = useLanguage();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["platform-activity-logs", categoryFilter, searchQuery, page],
    queryFn: async () => {
      let query = (supabase.from("platform_activity_logs" as any) as any)
        .select("*, tenants(name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (categoryFilter !== "all") {
        query = query.eq("event_category", categoryFilter);
      }

      if (searchQuery.trim()) {
        query = query.or(`description.ilike.%${searchQuery}%,user_email.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      auth: t("superAdmin.activityLog.catAuth"),
      subscription: t("superAdmin.activityLog.catSubscription"),
      tenant: t("superAdmin.activityLog.catTenant"),
      user: t("superAdmin.activityLog.catUser"),
      support: t("superAdmin.activityLog.catSupport"),
      general: t("superAdmin.activityLog.catGeneral"),
    };
    return map[cat] || cat;
  };

  const handleExport = () => {
    if (!data?.logs?.length) {
      toast.error(t("superAdmin.noDataToExport"));
      return;
    }
    const columns = [
      { key: "created_at" as const, header: t("common.date"), formatter: (v: string) => formatDateForCsv(v) },
      { key: "event_type" as const, header: t("superAdmin.activityLog.eventType") },
      { key: "event_category" as const, header: t("superAdmin.activityLog.category") },
      { key: "description" as const, header: t("superAdmin.activityLog.description") },
      { key: "user_email" as const, header: t("superAdmin.activityLog.userEmail") },
      { key: "tenants" as const, header: t("superAdmin.activityLog.church"), formatter: (v: any) => v?.name || "—" },
    ];
    exportToCsv(data.logs, columns, `activity-log_${new Date().toISOString().split("T")[0]}`);
    toast.success(t("superAdmin.csvExported"));
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("superAdmin.activityLog.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("superAdmin.activityLog.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            {t("superAdmin.exportCsv")}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("superAdmin.activityLog.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all") || "Tous"}</SelectItem>
                  <SelectItem value="auth">{t("superAdmin.activityLog.catAuth")}</SelectItem>
                  <SelectItem value="subscription">{t("superAdmin.activityLog.catSubscription")}</SelectItem>
                  <SelectItem value="tenant">{t("superAdmin.activityLog.catTenant")}</SelectItem>
                  <SelectItem value="user">{t("superAdmin.activityLog.catUser")}</SelectItem>
                  <SelectItem value="support">{t("superAdmin.activityLog.catSupport")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">{t("common.loading")}...</div>
        ) : !data?.logs?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">{t("superAdmin.activityLog.empty")}</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.logs.map((log: any) => {
              const Icon = CATEGORY_ICONS[log.event_category] || Activity;
              const isExpanded = expandedIds.has(log.id);
              const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <Card key={log.id} className="transition-colors hover:border-primary/20">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 flex-shrink-0 ${CATEGORY_COLORS[log.event_category] || CATEGORY_COLORS.general}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{log.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="secondary" className={CATEGORY_COLORS[log.event_category] || ""}>
                                {getCategoryLabel(log.event_category)}
                              </Badge>
                              {log.tenants?.name && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {log.tenants.name}
                                </span>
                              )}
                              {log.user_email && (
                                <span className="text-xs text-muted-foreground">{log.user_email}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                          </span>
                        </div>

                        {hasMetadata && (
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="text-xs text-primary hover:underline mt-2 flex items-center gap-1"
                          >
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            {isExpanded ? t("superAdmin.activityLog.hideDetails") : t("superAdmin.activityLog.showDetails")}
                          </button>
                        )}

                        {isExpanded && hasMetadata && (
                          <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-48">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t("superAdmin.activityLog.showing")} {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.total)} / {data.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    {t("superAdmin.activityLog.prev")}
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    {t("superAdmin.activityLog.next")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
