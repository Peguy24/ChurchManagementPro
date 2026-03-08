import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currency";
import {
  DollarSign, TrendingUp, TrendingDown, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, PieChart, RefreshCw, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCsv, CsvColumn } from "@/lib/csvExport";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays, isPast } from "date-fns";
import { fr, enUS } from "date-fns/locale";

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted-foreground))",
  basic: "hsl(210, 80%, 55%)",
  standard: "hsl(150, 60%, 45%)",
  premium: "hsl(280, 60%, 55%)",
  enterprise: "hsl(35, 90%, 50%)",
  none: "hsl(0, 0%, 75%)",
};

const STATUS_COLORS: Record<string, string> = {
  active: "hsl(150, 60%, 45%)",
  trial: "hsl(210, 80%, 55%)",
  suspended: "hsl(35, 90%, 50%)",
  cancelled: "hsl(0, 70%, 55%)",
};

export default function RevenueAnalytics() {
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : enUS;

  const planLabels: Record<string, string> = {
    free: t("superAdmin.free") || "Free",
    basic: t("superAdmin.planBasic") || "Basic",
    standard: t("superAdmin.planStandard") || "Standard",
    premium: t("superAdmin.planPremium") || "Premium",
    enterprise: t("superAdmin.planEnterprise") || "Enterprise",
    none: t("superAdmin.noPlan") || "None",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-analytics"],
    queryFn: async () => {
      // 1. All subscriptions with tenant created_at
      const { data: subs, error: subsErr } = await supabase
        .from("tenant_subscriptions")
        .select("*, tenants(created_at)");
      if (subsErr) throw subsErr;

      // 2. Subscription audit logs for historical changes
      const { data: auditLogs, error: auditErr } = await supabase
        .from("subscription_audit_logs")
        .select("*")
        .order("created_at", { ascending: true });
      if (auditErr) throw auditErr;

      return { subscriptions: subs || [], auditLogs: auditLogs || [] };
    },
  });

  // Compute analytics
  const analytics = computeAnalytics(data?.subscriptions || [], data?.auditLogs || []);

  const handleExportCSV = () => {
    if (!data?.subscriptions?.length) {
      toast.error(t("superAdmin.revenue.noData") || "No data to export");
      return;
    }
    const subs = data.subscriptions;
    const columns: CsvColumn<any>[] = [
      { key: "tenants.created_at", header: t("superAdmin.revenue.tenantCreated") || "Tenant Created", formatter: (v) => v ? new Date(v).toLocaleDateString() : "" },
      { key: "plan", header: "Plan" },
      { key: "status", header: "Status" },
      { key: "price_monthly", header: "MRR ($)", formatter: (v) => (v || 0).toFixed(2) },
      { key: "trial_ends_at", header: t("superAdmin.revenue.trialEnds") || "Trial Ends", formatter: (v) => v ? new Date(v).toLocaleDateString() : "" },
      { key: "created_at", header: t("superAdmin.revenue.subscriptionCreated") || "Subscription Created", formatter: (v) => v ? new Date(v).toLocaleDateString() : "" },
    ];
    exportToCsv(subs, columns, `revenue-analytics-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success(t("superAdmin.revenue.exported") || "Export completed");
  };

  const StatCard = ({
    title, value, icon: Icon, description, trend, loading,
  }: {
    title: string; value: string | number; icon: React.ElementType;
    description?: string; trend?: { value: number; positive: boolean }; loading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{value}</span>
              {trend && (
                <span className={`flex items-center text-xs font-medium ${trend.positive ? "text-emerald-600" : "text-rose-600"}`}>
                  {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend.value).toFixed(1)}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t("superAdmin.revenue.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("superAdmin.revenue.subtitle")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isLoading || !data?.subscriptions?.length}>
            <Download className="h-4 w-4 mr-2" />
            {t("superAdmin.revenue.exportCsv") || "Export CSV"}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("superAdmin.revenue.mrr")}
            value={formatCurrency(analytics.currentMRR)}
            icon={DollarSign}
            description={t("superAdmin.revenue.mrrDesc")}
            trend={analytics.mrrGrowth !== null ? { value: analytics.mrrGrowth, positive: analytics.mrrGrowth >= 0 } : undefined}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.revenue.arr")}
            value={formatCurrency(analytics.currentMRR * 12)}
            icon={TrendingUp}
            description={t("superAdmin.revenue.arrDesc")}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.revenue.churnRate")}
            value={`${analytics.churnRate.toFixed(1)}%`}
            icon={analytics.churnRate > 5 ? TrendingDown : RefreshCw}
            description={t("superAdmin.revenue.churnDesc")}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.revenue.trialConversion")}
            value={`${analytics.trialConversionRate.toFixed(0)}%`}
            icon={Users}
            description={`${analytics.convertedTrials}/${analytics.totalTrialsEver} ${t("superAdmin.revenue.converted")}`}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* MRR Growth Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t("superAdmin.revenue.mrrGrowth")}
              </CardTitle>
              <CardDescription>{t("superAdmin.revenue.mrrGrowthDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={analytics.mrrHistory}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                    <YAxis className="text-xs fill-muted-foreground" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`$${value.toFixed(0)}`, "MRR"]}
                    />
                    <Area
                      type="monotone" dataKey="mrr" stroke="hsl(var(--primary))"
                      fillOpacity={1} fill="url(#mrrGradient)" strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                {t("superAdmin.revenue.planDistribution")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <RePieChart>
                      <Pie
                        data={analytics.planDistribution}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={85}
                        paddingAngle={3} dataKey="count"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.planDistribution.map((entry, i) => (
                          <Cell key={i} fill={PLAN_COLORS[entry.plan] || PLAN_COLORS.none} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [value, name]} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {analytics.planDistribution.map((d) => (
                      <div key={d.plan} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[d.plan] || PLAN_COLORS.none }} />
                        <span className="text-muted-foreground">{d.name}: {d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t("superAdmin.revenue.statusBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics.statusDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs fill-muted-foreground" />
                    <YAxis dataKey="name" type="category" width={90} className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {analytics.statusDistribution.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || STATUS_COLORS.active} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Trial Pipeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("superAdmin.revenue.trialPipeline")}</CardTitle>
              <CardDescription>{t("superAdmin.revenue.trialPipelineDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{analytics.totalTrialsEver}</p>
                    <p className="text-xs text-muted-foreground">{t("superAdmin.revenue.totalTrials")}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{analytics.activeTrials}</p>
                    <p className="text-xs text-muted-foreground">{t("superAdmin.revenue.activeTrials")}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-emerald-600">{analytics.convertedTrials}</p>
                    <p className="text-xs text-muted-foreground">{t("superAdmin.revenue.convertedTrials")}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-rose-600">{analytics.expiredTrials}</p>
                    <p className="text-xs text-muted-foreground">{t("superAdmin.revenue.expiredTrials")}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Plan */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("superAdmin.revenue.revenueByPlan")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="space-y-3">
                  {analytics.revenueByPlan.map((p) => (
                    <div key={p.plan} className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PLAN_COLORS[p.plan] || PLAN_COLORS.none }} />
                      <span className="text-sm font-medium w-24">{p.name}</span>
                      <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${analytics.currentMRR > 0 ? (p.revenue / analytics.currentMRR) * 100 : 0}%`,
                            backgroundColor: PLAN_COLORS[p.plan] || PLAN_COLORS.none,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-20 text-right">{formatCurrency(p.revenue)}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">{p.count} {t("superAdmin.revenue.clients")}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// -------------------------------------------------------------------
// Analytics computation
// -------------------------------------------------------------------

interface AnalyticsResult {
  currentMRR: number;
  mrrGrowth: number | null;
  churnRate: number;
  trialConversionRate: number;
  totalTrialsEver: number;
  activeTrials: number;
  convertedTrials: number;
  expiredTrials: number;
  mrrHistory: { month: string; mrr: number }[];
  planDistribution: { plan: string; name: string; count: number }[];
  statusDistribution: { status: string; name: string; count: number }[];
  revenueByPlan: { plan: string; name: string; revenue: number; count: number }[];
}

function computeAnalytics(subscriptions: any[], auditLogs: any[]): AnalyticsResult {
  const planLabels: Record<string, string> = {
    free: "Free", basic: "Basic", standard: "Standard",
    premium: "Premium", enterprise: "Enterprise", none: "None",
  };

  // Current MRR
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const currentMRR = activeSubs.reduce((sum, s) => sum + (s.price_monthly || 0), 0);

  // Plan distribution
  const planCounts: Record<string, number> = {};
  subscriptions.forEach((s) => {
    planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
  });
  const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
    plan, name: planLabels[plan] || plan, count,
  }));

  // Status distribution
  const statusCounts: Record<string, number> = {};
  subscriptions.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  const statusLabels: Record<string, string> = {
    active: "Active", trial: "Trial", suspended: "Suspended", cancelled: "Cancelled",
  };
  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status, name: statusLabels[status] || status, count,
  }));

  // Revenue by plan
  const revByPlan: Record<string, { revenue: number; count: number }> = {};
  activeSubs.forEach((s) => {
    if (!revByPlan[s.plan]) revByPlan[s.plan] = { revenue: 0, count: 0 };
    revByPlan[s.plan].revenue += s.price_monthly || 0;
    revByPlan[s.plan].count += 1;
  });
  const revenueByPlan = Object.entries(revByPlan)
    .map(([plan, d]) => ({ plan, name: planLabels[plan] || plan, ...d }))
    .sort((a, b) => b.revenue - a.revenue);

  // Trial metrics
  const activeTrials = subscriptions.filter((s) => s.status === "trial").length;
  const expiredTrials = subscriptions.filter(
    (s) => s.status !== "active" && s.trial_ends_at && isPast(new Date(s.trial_ends_at))
  ).length;

  // Count conversions from audit logs (trial -> active)
  const convertedTrials = auditLogs.filter(
    (log) =>
      (log.action_type === "plan_activated" || log.action_type === "subscription_updated") &&
      log.old_values &&
      (typeof log.old_values === "object" && (log.old_values as any).status === "trial") &&
      log.new_values &&
      (typeof log.new_values === "object" && (log.new_values as any).status === "active")
  ).length;

  // Fallback: count active subs that had a trial_ends_at
  const convertedFromTrialDirect = activeSubs.filter((s) => s.trial_ends_at).length;
  const totalConverted = Math.max(convertedTrials, convertedFromTrialDirect);

  const totalTrialsEver = activeTrials + expiredTrials + totalConverted;
  const trialConversionRate = totalTrialsEver > 0 ? (totalConverted / totalTrialsEver) * 100 : 0;

  // Churn: cancelled or suspended / total
  const churned = subscriptions.filter((s) => s.status === "cancelled" || s.status === "suspended").length;
  const churnRate = subscriptions.length > 0 ? (churned / subscriptions.length) * 100 : 0;

  // MRR History (approximate from tenant created_at + current price)
  // Build 12-month history
  const now = new Date();
  const mrrHistory: { month: string; mrr: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthEnd = endOfMonth(monthDate);
    const monthLabel = format(monthDate, "MMM yy");

    // Sum MRR for all subs whose tenant was created before this month end and status is active
    let monthMRR = 0;
    subscriptions.forEach((s) => {
      const tenantCreated = new Date(s.tenants?.created_at || s.created_at);
      if (tenantCreated <= monthEnd && s.status === "active") {
        monthMRR += s.price_monthly || 0;
      }
    });

    mrrHistory.push({ month: monthLabel, mrr: monthMRR });
  }

  // MRR growth (compare last 2 months)
  const lastMonth = mrrHistory[mrrHistory.length - 1]?.mrr || 0;
  const prevMonth = mrrHistory[mrrHistory.length - 2]?.mrr || 0;
  const mrrGrowth = prevMonth > 0 ? ((lastMonth - prevMonth) / prevMonth) * 100 : null;

  return {
    currentMRR,
    mrrGrowth,
    churnRate,
    trialConversionRate,
    totalTrialsEver,
    activeTrials,
    convertedTrials: totalConverted,
    expiredTrials,
    mrrHistory,
    planDistribution,
    statusDistribution,
    revenueByPlan,
  };
}
