import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, TrendingUp, UserCheck, Clock, Eye, Download, Activity, BarChart3, Heart, Megaphone, CreditCard, ShieldAlert, GitCompareArrows, Palette } from "lucide-react";
import { SuperAdminOnboardingOverview } from "@/components/SuperAdminOnboardingOverview";
import { SupportTicketsSummary } from "@/components/superadmin/SupportTicketsSummary";
import { PlatformAlertsWidget } from "@/components/superadmin/PlatformAlertsWidget";
import { RecentActivityFeed } from "@/components/superadmin/RecentActivityFeed";
import { MiniRevenueChart } from "@/components/superadmin/MiniRevenueChart";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const planDisplayName: Record<string, string> = {
    free: t("superAdmin.free"),
    basic: t("superAdmin.planBasic"),
    standard: t("superAdmin.planStandard"),
    premium: t("superAdmin.planPremium"),
    none: t("superAdmin.noPlan"),
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      // Fetch tenants count
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

      if (tenantsError) throw tenantsError;

      // Fetch subscriptions with revenue
      const { data: subscriptions, error: subsError } = await supabase
        .from("tenant_subscriptions")
        .select("price_monthly, status");

      if (subsError) throw subsError;

      const totalRevenue = subscriptions?.filter(sub => sub.status === "active").reduce((sum, sub) => sum + (sub.price_monthly || 0), 0) || 0;
      const activeSubscriptions = subscriptions?.filter(sub => sub.status === "active").length || 0;
      const trialSubscriptions = subscriptions?.filter(sub => sub.status === "trial").length || 0;

      // Fetch users count (approved tenant admins)
      const { count: usersCount, error: usersError } = await supabase
        .from("tenant_user_roles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);

      if (usersError) throw usersError;

      // Fetch recent tenants
      const { data: recentTenants, error: recentError } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          contact_email,
          created_at,
          tenant_subscriptions!inner(plan, status)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      return {
        tenantsCount: tenantsCount || 0,
        totalRevenue,
        activeSubscriptions,
        trialSubscriptions,
        usersCount: usersCount || 0,
        recentTenants: recentTenants || [],
      };
    },
  });

  // Query for full tenants export
  const { data: allTenants } = useQuery({
    queryKey: ["all-tenants-for-export"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          slug,
          contact_email,
          contact_phone,
          address,
          created_at,
          tenant_subscriptions(plan, status, price_monthly, trial_ends_at)
        `)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const handleExportTenants = () => {
    if (!allTenants || allTenants.length === 0) {
      toast.error(t("superAdmin.noDataToExport"));
      return;
    }

    const columns = [
      { key: "name", header: t("superAdmin.churchName") },
      { key: "slug", header: t("superAdmin.slug") },
      { key: "contact_email", header: t("superAdmin.contactEmail") },
      { key: "contact_phone", header: t("superAdmin.contactPhone") },
      { key: "address", header: t("common.address") },
      { 
        key: "tenant_subscriptions", 
        header: t("superAdmin.plan"),
        formatter: (subs: any[]) => subs?.[0]?.status === "trial"
          ? t("superAdmin.statusTrial")
          : planDisplayName[subs?.[0]?.plan] || subs?.[0]?.plan || "Aucun"
      },
      { 
        key: "tenant_subscriptions", 
        header: t("superAdmin.status"),
        formatter: (subs: any[]) => subs?.[0]?.status || "-"
      },
      { 
        key: "tenant_subscriptions", 
        header: t("superAdmin.monthlyRevenueShort"),
        formatter: (subs: any[]) => formatCurrencyForCsv(subs?.[0]?.price_monthly)
      },
      { 
        key: "created_at", 
        header: t("common.date"),
        formatter: (val: string) => formatDateForCsv(val)
      },
    ];

    exportToCsv(allTenants, columns, `churches_${new Date().toISOString().split('T')[0]}`);
    toast.success(t("superAdmin.csvExported"));
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    loading 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    description?: string;
    loading: boolean;
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
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  const dateLocale = language === "fr" ? "fr-FR" : language === "ht" ? "fr-HT" : "en-US";

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("superAdmin.dashboardTitle")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {t("superAdmin.dashboardSubtitle")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExportTenants} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              {t("superAdmin.exportCsv")}
            </Button>
            <Button onClick={() => navigate("/settings/tenants")} className="w-full sm:w-auto">
              {t("superAdmin.manageChurches")}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t("superAdmin.totalChurches")}
            value={stats?.tenantsCount || 0}
            icon={Building2}
            description={t("superAdmin.registeredChurches")}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.monthlyRevenue")}
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={DollarSign}
            description={t("superAdmin.recurringRevenue")}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.activeUsers")}
            value={stats?.usersCount || 0}
            icon={Users}
            description={t("superAdmin.approvedUsers")}
            loading={isLoading}
          />
          <StatCard
            title={t("superAdmin.activeSubscriptions")}
            value={stats?.activeSubscriptions || 0}
            icon={TrendingUp}
            description={`${stats?.trialSubscriptions || 0} ${t("superAdmin.inTrial")}`}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <MiniRevenueChart />
          <PlatformAlertsWidget />
        </div>

        <SuperAdminOnboardingOverview />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <SupportTicketsSummary />
          <RecentActivityFeed />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("superAdmin.recentChurches")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : stats?.recentTenants?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t("superAdmin.noChurchRegistered")}
                </p>
              ) : (
                <div className="space-y-3">
                  {stats?.recentTenants?.map((tenant: any) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.contact_email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          (Array.isArray(tenant.tenant_subscriptions) ? tenant.tenant_subscriptions?.[0]?.status : tenant.tenant_subscriptions?.status) === "active"
                            ? "bg-green-100 text-green-800"
                            : (Array.isArray(tenant.tenant_subscriptions) ? tenant.tenant_subscriptions?.[0]?.status : tenant.tenant_subscriptions?.status) === "trial"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {(() => {
                            const sub = Array.isArray(tenant.tenant_subscriptions) ? tenant.tenant_subscriptions?.[0] : tenant.tenant_subscriptions;
                            return sub?.status === "trial"
                              ? t("superAdmin.statusTrial")
                              : planDisplayName[sub?.plan] || sub?.plan || "Aucun";
                          })()}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tenant.created_at).toLocaleDateString(dateLocale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                {t("superAdmin.quickActions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { icon: Building2, label: t("superAdmin.manageChurches"), path: "/settings/tenants" },
                  { icon: Eye, label: t("superAdmin.exploreChurchData"), path: "/super-admin/explore" },
                  { icon: Users, label: t("superAdmin.userManagement"), path: "/settings/users" },
                  { icon: Activity, label: t("superAdmin.activityLog.title"), path: "/super-admin/activity" },
                  { icon: BarChart3, label: t("superAdmin.revenue.title"), path: "/super-admin/revenue" },
                  { icon: Heart, label: t("superAdmin.health.title"), path: "/super-admin/health" },
                  { icon: Megaphone, label: t("superAdmin.banners.navTitle"), path: "/super-admin/banners" },
                  { icon: CreditCard, label: t("superAdmin.overrides.navTitle"), path: "/super-admin/subscriptions" },
                  { icon: ShieldAlert, label: t("superAdmin.churn.navTitle"), path: "/super-admin/churn" },
                  { icon: GitCompareArrows, label: t("superAdmin.comparison.navTitle"), path: "/super-admin/comparison" },
                  { icon: Palette, label: t("superAdmin.whiteLabel.navTitle"), path: "/super-admin/branding" },
                ].map((item) => (
                  <Button
                    key={item.path}
                    variant="outline"
                    className="w-full justify-start text-left truncate"
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
