import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { exportToCsv, CsvColumn } from "@/lib/csvExport";
import { toast } from "sonner";
import {
  Heart, RefreshCw, Search, Download, TrendingUp, TrendingDown,
  Users, CalendarCheck, DollarSign, Puzzle, ArrowUpRight, Minus,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

const GRADE_COLORS: Record<string, string> = {
  "A+": "bg-emerald-500",
  A: "bg-emerald-400",
  B: "bg-sky-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-destructive",
};

const GRADE_TEXT_COLORS: Record<string, string> = {
  "A+": "text-emerald-600",
  A: "text-emerald-500",
  B: "text-sky-600",
  C: "text-amber-600",
  D: "text-orange-600",
  F: "text-destructive",
};

interface HealthScore {
  id: string;
  tenant_id: string;
  overall_score: number;
  member_engagement_score: number;
  attendance_score: number;
  donation_score: number;
  feature_adoption_score: number;
  total_members: number;
  active_members_30d: number;
  attendance_rate_30d: number;
  total_donations_30d: number;
  avg_donation: number;
  features_used: number;
  features_total: number;
  health_grade: string;
  trend: string;
  details: any;
  calculated_at: string;
  tenants?: { name: string; contact_email: string };
}

export default function ChurchHealthScores() {
  const { t } = useLanguage();

  if (!planLoading && !hasFeature("churchHealth")) {
    return (
      <Layout>
        <FeatureLockedCard featureName="Church Health Scores" featureDescription="Scores de santé des églises et analyses avancées" requiredPlan="professionnel" icon={<Heart className="w-8 h-8 text-muted-foreground" />} />
      </Layout>
    );
  }
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"overall_score" | "health_grade" | "total_members">("overall_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: scores, isLoading } = useQuery({
    queryKey: ["church-health-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_health_scores")
        .select("*, tenants(name, contact_email)")
        .order("overall_score", { ascending: false });
      if (error) throw error;
      return (data || []) as HealthScore[];
    },
  });

  const recalculate = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("calculate-church-health", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["church-health-scores"] });
      toast.success(`${t("superAdmin.health.recalculated")} (${data?.computed || 0})`);
    },
    onError: () => toast.error(t("superAdmin.health.recalcError")),
  });

  const handleExport = () => {
    if (!filtered.length) return;
    const columns: CsvColumn<HealthScore>[] = [
      { key: "tenants.name", header: t("superAdmin.churchName"), formatter: (_, r) => r.tenants?.name || "" },
      { key: "health_grade", header: "Grade" },
      { key: "overall_score", header: t("superAdmin.health.overall") },
      { key: "member_engagement_score", header: t("superAdmin.health.engagement") },
      { key: "attendance_score", header: t("superAdmin.health.attendance") },
      { key: "donation_score", header: t("superAdmin.health.donations") },
      { key: "feature_adoption_score", header: t("superAdmin.health.features") },
      { key: "total_members", header: t("superAdmin.health.totalMembers") },
      { key: "active_members_30d", header: t("superAdmin.health.activeMembers") },
      { key: "attendance_rate_30d", header: t("superAdmin.health.attendanceRate") },
      { key: "total_donations_30d", header: t("superAdmin.health.donations30d") },
      { key: "features_used", header: t("superAdmin.health.featuresUsed") },
    ];
    exportToCsv(filtered, columns, `church-health-${format(new Date(), "yyyy-MM-dd")}`);
    toast.success("Export CSV");
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const filtered = (scores || [])
    .filter(s => !search || s.tenants?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const val = sortDir === "desc" ? -1 : 1;
      return ((a[sortBy] as number) - (b[sortBy] as number)) * val;
    });

  // Summary stats
  const avgScore = filtered.length ? Math.round(filtered.reduce((s, h) => s + h.overall_score, 0) / filtered.length) : 0;
  const gradeDistribution = filtered.reduce((acc, h) => {
    acc[h.health_grade] = (acc[h.health_grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ScoreBar = ({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-medium">{score}/100</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  );

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              {t("superAdmin.health.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("superAdmin.health.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => recalculate.mutate()}
              disabled={recalculate.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${recalculate.isPending ? "animate-spin" : ""}`} />
              {t("superAdmin.health.recalculate")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("superAdmin.health.avgScore")}</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">{avgScore}/100</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("superAdmin.health.totalChurches")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold">{filtered.length}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("superAdmin.health.healthyCount")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold text-emerald-600">
                  {filtered.filter(s => s.overall_score >= 70).length}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("superAdmin.health.atRiskCount")}</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div className="text-2xl font-bold text-destructive">
                  {filtered.filter(s => s.overall_score < 40).length}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grade Distribution */}
        {!isLoading && filtered.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{t("superAdmin.health.gradeDistribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {["A+", "A", "B", "C", "D", "F"].map(grade => (
                  <div key={grade} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold ${GRADE_COLORS[grade]}`}>
                      {grade}
                    </div>
                    <span className="text-sm text-muted-foreground">{gradeDistribution[grade] || 0}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("superAdmin.health.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {([
              ["overall_score", t("superAdmin.health.score")] as const,
              ["total_members", t("superAdmin.health.members")] as const,
            ]).map(([key, label]) => (
              <Button
                key={key}
                variant={sortBy === key ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort(key)}
              >
                {label}
                {sortBy === key && (sortDir === "desc" ? <ChevronDown className="ml-1 h-3 w-3" /> : <ChevronUp className="ml-1 h-3 w-3" />)}
              </Button>
            ))}
          </div>
        </div>

        {/* Scores List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {scores?.length === 0
                ? t("superAdmin.health.noScores")
                : t("superAdmin.health.noResults")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(score => {
              const expanded = expandedId === score.id;
              return (
                <Card
                  key={score.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setExpandedId(expanded ? null : score.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Grade badge */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ${GRADE_COLORS[score.health_grade]}`}>
                        {score.health_grade}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{score.tenants?.name || score.tenant_id}</h3>
                          <span className={`text-sm font-bold ${GRADE_TEXT_COLORS[score.health_grade]}`}>
                            {score.overall_score}/100
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {score.total_members} {t("superAdmin.health.members")}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="h-3 w-3" /> {score.active_members_30d} {t("superAdmin.health.active30d")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Puzzle className="h-3 w-3" /> {score.features_used}/{score.features_total} {t("superAdmin.health.features")}
                          </span>
                        </div>
                      </div>

                      {/* Expand toggle */}
                      <div className="flex-shrink-0">
                        {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <ScoreBar label={t("superAdmin.health.engagement")} score={score.member_engagement_score} icon={Users} />
                            <ScoreBar label={t("superAdmin.health.attendance")} score={score.attendance_score} icon={CalendarCheck} />
                            <ScoreBar label={t("superAdmin.health.donations")} score={score.donation_score} icon={DollarSign} />
                            <ScoreBar label={t("superAdmin.health.features")} score={score.feature_adoption_score} icon={Puzzle} />
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("superAdmin.health.attendanceRate")}</span>
                              <span className="font-medium">{score.attendance_rate_30d}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("superAdmin.health.donations30d")}</span>
                              <span className="font-medium">${score.total_donations_30d.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("superAdmin.health.avgDonation")}</span>
                              <span className="font-medium">${score.avg_donation.toFixed(2)}</span>
                            </div>
                            {score.details?.feature_list && (
                              <div className="pt-2">
                                <p className="text-muted-foreground mb-1">{t("superAdmin.health.activeFeatures")}</p>
                                <div className="flex flex-wrap gap-1">
                                  {score.details.feature_list.map((f: string) => (
                                    <Badge key={f} variant="secondary" className="text-xs capitalize">{f}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground pt-1">
                              {t("superAdmin.health.lastCalculated")}: {new Date(score.calculated_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
