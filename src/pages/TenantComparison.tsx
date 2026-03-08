import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { GitCompareArrows, Users, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currency";

export default function TenantComparison() {
  const { t } = useLanguage();
  const [tenantA, setTenantA] = useState<string>("");
  const [tenantB, setTenantB] = useState<string>("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-comparison-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const fetchTenantMetrics = async (tenantId: string) => {
    const [members, donations, attendance, events, healthScore] = await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "active"),
      supabase.from("donations").select("amount").eq("tenant_id", tenantId).gte("donation_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      supabase.from("attendance_records").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("event_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
      supabase.from("tenant_health_scores").select("*").eq("tenant_id", tenantId).order("calculated_at", { ascending: false }).limit(1),
    ]);

    const totalDonations = (donations.data || []).reduce((sum, d) => sum + d.amount, 0);
    const health = healthScore.data?.[0];

    return {
      members: members.count || 0,
      donations90d: totalDonations,
      attendance90d: attendance.count || 0,
      events: events.count || 0,
      healthScore: health?.overall_score || 0,
      healthGrade: health?.health_grade || "N/A",
      memberEngagement: health?.member_engagement_score || 0,
      attendanceScore: health?.attendance_score || 0,
      donationScore: health?.donation_score || 0,
      featureAdoption: health?.feature_adoption_score || 0,
    };
  };

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["tenant-comparison", tenantA, tenantB],
    queryFn: async () => {
      if (!tenantA || !tenantB) return null;
      const [metricsA, metricsB] = await Promise.all([
        fetchTenantMetrics(tenantA),
        fetchTenantMetrics(tenantB),
      ]);
      return { a: metricsA, b: metricsB };
    },
    enabled: !!tenantA && !!tenantB,
  });

  const tenantAName = tenants?.find(t => t.id === tenantA)?.name || "Church A";
  const tenantBName = tenants?.find(t => t.id === tenantB)?.name || "Church B";

  const barData = comparison ? [
    { name: t("superAdmin.comparison.members"), [tenantAName]: comparison.a.members, [tenantBName]: comparison.b.members },
    { name: t("superAdmin.comparison.attendance"), [tenantAName]: comparison.a.attendance90d, [tenantBName]: comparison.b.attendance90d },
    { name: t("superAdmin.comparison.events"), [tenantAName]: comparison.a.events, [tenantBName]: comparison.b.events },
  ] : [];

  const radarData = comparison ? [
    { metric: t("superAdmin.comparison.engagement"), A: comparison.a.memberEngagement, B: comparison.b.memberEngagement },
    { metric: t("superAdmin.comparison.attendance"), A: comparison.a.attendanceScore, B: comparison.b.attendanceScore },
    { metric: t("superAdmin.comparison.giving"), A: comparison.a.donationScore, B: comparison.b.donationScore },
    { metric: t("superAdmin.comparison.features"), A: comparison.a.featureAdoption, B: comparison.b.featureAdoption },
    { metric: t("superAdmin.comparison.overall"), A: comparison.a.healthScore, B: comparison.b.healthScore },
  ] : [];

  const MetricCard = ({ icon: Icon, label, valueA, valueB, format: fmt }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground truncate">{tenantAName}</p>
            <p className="text-xl font-bold">{fmt ? fmt(valueA) : valueA}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground truncate">{tenantBName}</p>
            <p className="text-xl font-bold">{fmt ? fmt(valueB) : valueB}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitCompareArrows className="h-7 w-7" />
            {t("superAdmin.comparison.title")}
          </h1>
          <p className="text-muted-foreground">{t("superAdmin.comparison.subtitle")}</p>
        </div>

        {/* Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">{t("superAdmin.comparison.churchA")}</label>
              <Select value={tenantA} onValueChange={setTenantA}>
                <SelectTrigger><SelectValue placeholder={t("superAdmin.comparison.select")} /></SelectTrigger>
                <SelectContent>
                  {(tenants || []).filter(t => t.id !== tenantB).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">{t("superAdmin.comparison.churchB")}</label>
              <Select value={tenantB} onValueChange={setTenantB}>
                <SelectTrigger><SelectValue placeholder={t("superAdmin.comparison.select")} /></SelectTrigger>
                <SelectContent>
                  {(tenants || []).filter(t => t.id !== tenantA).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        )}

        {comparison && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={Users} label={t("superAdmin.comparison.totalMembers")} valueA={comparison.a.members} valueB={comparison.b.members} />
              <MetricCard icon={DollarSign} label={t("superAdmin.comparison.donations90d")} valueA={comparison.a.donations90d} valueB={comparison.b.donations90d} format={(v: number) => formatCurrency(v)} />
              <MetricCard icon={Calendar} label={t("superAdmin.comparison.attendance90d")} valueA={comparison.a.attendance90d} valueB={comparison.b.attendance90d} />
              <MetricCard icon={TrendingUp} label={t("superAdmin.comparison.healthScore")} valueA={`${comparison.a.healthScore}% (${comparison.a.healthGrade})`} valueB={`${comparison.b.healthScore}% (${comparison.b.healthGrade})`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("superAdmin.comparison.metricsComparison")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey={tenantAName} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey={tenantBName} fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("superAdmin.comparison.healthComparison")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" fontSize={11} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                      <Radar name={tenantAName} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      <Radar name={tenantBName} dataKey="B" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.2} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {!tenantA || !tenantB ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <GitCompareArrows className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>{t("superAdmin.comparison.selectBoth")}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
