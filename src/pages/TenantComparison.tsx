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
import { formatDateInputValue } from "@/lib/date";


const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "Church Comparison",
    subtitle: "Compare metrics between two churches side by side",
    churchA: "Church A",
    churchB: "Church B",
    select: "Select a church",
    selectBoth: "Select two churches to compare their metrics",
    members: "Members",
    totalMembers: "Total Active Members",
    donations90d: "Donations (90 days)",
    attendance90d: "Attendance (90 days)",
    attendance: "Attendance",
    events: "Events",
    healthScore: "Health Score",
    metricsComparison: "Metrics Comparison",
    healthComparison: "Health Comparison",
    engagement: "Engagement",
    giving: "Giving",
    features: "Features",
    overall: "Overall",
  },
  fr: {
    title: "Comparaison des Églises",
    subtitle: "Comparez les métriques de deux églises côte à côte",
    churchA: "Église A",
    churchB: "Église B",
    select: "Sélectionner une église",
    selectBoth: "Sélectionnez deux églises pour comparer leurs métriques",
    members: "Membres",
    totalMembers: "Total Membres Actifs",
    donations90d: "Dons (90 jours)",
    attendance90d: "Présence (90 jours)",
    attendance: "Présence",
    events: "Événements",
    healthScore: "Score de Santé",
    metricsComparison: "Comparaison des Métriques",
    healthComparison: "Comparaison de Santé",
    engagement: "Engagement",
    giving: "Dons",
    features: "Fonctionnalités",
    overall: "Global",
  },
  ht: {
    title: "Konparezon Legliz",
    subtitle: "Konpare metrik ant de legliz kote ak kote",
    churchA: "Legliz A",
    churchB: "Legliz B",
    select: "Chwazi yon legliz",
    selectBoth: "Chwazi de legliz pou konpare metrik yo",
    members: "Manm",
    totalMembers: "Total Manm Aktif",
    donations90d: "Don (90 jou)",
    attendance90d: "Prezans (90 jou)",
    attendance: "Prezans",
    events: "Evènman",
    healthScore: "Nòt Sante",
    metricsComparison: "Konparezon Metrik",
    healthComparison: "Konparezon Sante",
    engagement: "Angajman",
    giving: "Don",
    features: "Fonksyonalite",
    overall: "Global",
  },
};

export default function TenantComparison() {
  const { language } = useLanguage();
  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;
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
    { name: lt("members"), [tenantAName]: comparison.a.members, [tenantBName]: comparison.b.members },
    { name: lt("attendance"), [tenantAName]: comparison.a.attendance90d, [tenantBName]: comparison.b.attendance90d },
    { name: lt("events"), [tenantAName]: comparison.a.events, [tenantBName]: comparison.b.events },
  ] : [];

  const radarData = comparison ? [
    { metric: lt("engagement"), A: comparison.a.memberEngagement, B: comparison.b.memberEngagement },
    { metric: lt("attendance"), A: comparison.a.attendanceScore, B: comparison.b.attendanceScore },
    { metric: lt("giving"), A: comparison.a.donationScore, B: comparison.b.donationScore },
    { metric: lt("features"), A: comparison.a.featureAdoption, B: comparison.b.featureAdoption },
    { metric: lt("overall"), A: comparison.a.healthScore, B: comparison.b.healthScore },
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
            {lt("title")}
          </h1>
          <p className="text-muted-foreground">{lt("subtitle")}</p>
        </div>

        {/* Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">{lt("churchA")}</label>
              <Select value={tenantA} onValueChange={setTenantA}>
                <SelectTrigger><SelectValue placeholder={lt("select")} /></SelectTrigger>
                <SelectContent>
                  {(tenants || []).filter(tenant => tenant.id !== tenantB).map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <label className="text-sm font-medium mb-2 block">{lt("churchB")}</label>
              <Select value={tenantB} onValueChange={setTenantB}>
                <SelectTrigger><SelectValue placeholder={lt("select")} /></SelectTrigger>
                <SelectContent>
                  {(tenants || []).filter(tenant => tenant.id !== tenantA).map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
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
              <MetricCard icon={Users} label={lt("totalMembers")} valueA={comparison.a.members} valueB={comparison.b.members} />
              <MetricCard icon={DollarSign} label={lt("donations90d")} valueA={comparison.a.donations90d} valueB={comparison.b.donations90d} format={(v: number) => formatCurrency(v)} />
              <MetricCard icon={Calendar} label={lt("attendance90d")} valueA={comparison.a.attendance90d} valueB={comparison.b.attendance90d} />
              <MetricCard icon={TrendingUp} label={lt("healthScore")} valueA={`${comparison.a.healthScore}% (${comparison.a.healthGrade})`} valueB={`${comparison.b.healthScore}% (${comparison.b.healthGrade})`} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{lt("metricsComparison")}</CardTitle>
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
                  <CardTitle>{lt("healthComparison")}</CardTitle>
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
              <p>{lt("selectBoth")}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
