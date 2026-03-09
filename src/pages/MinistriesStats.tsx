import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, TrendingUp, Briefcase, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateInputValue, toSafeDate } from "@/lib/date";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
];

interface MinistryStats {
  id: string;
  name: string;
  member_count: number;
  active_status: string;
  leader_name: string | null;
}

const getLocale = (lang: string) => {
  switch (lang) {
    case "en": return "en-US";
    case "ht": return "fr-HT";
    default: return "fr-FR";
  }
};

export default function MinistriesStats() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState("6");
  const locale = getLocale(language);

  const { data: ministriesData = [], isLoading } = useQuery({
    queryKey: ["ministries-stats"],
    queryFn: async () => {
      const { data: ministries, error: ministriesError } = await supabase
        .from("ministries")
        .select(`
          id,
          name,
          status,
          leader:members!ministries_leader_id_fkey(first_name, last_name)
        `)
        .order("name");

      if (ministriesError) throw ministriesError;

      const stats: MinistryStats[] = await Promise.all(
        ministries.map(async (ministry) => {
          const { count } = await supabase
            .from("ministry_members")
            .select("*", { count: "exact", head: true })
            .eq("ministry_id", ministry.id);

          return {
            id: ministry.id,
            name: ministry.name,
            member_count: count || 0,
            active_status: ministry.status,
            leader_name: ministry.leader
              ? `${ministry.leader.first_name} ${ministry.leader.last_name}`
              : null,
          };
        })
      );

      return stats;
    },
  });

  const { data: roleDistribution = [] } = useQuery({
    queryKey: ["role-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministry_members")
        .select("role");

      if (error) throw error;

      const roleCounts: { [key: string]: number } = {};
      data.forEach((item) => {
        roleCounts[item.role] = (roleCounts[item.role] || 0) + 1;
      });

      return Object.entries(roleCounts).map(([role, count]) => ({
        role,
        count,
      }));
    },
  });

  const { data: monthlyGrowth = [] } = useQuery({
    queryKey: ["ministry-growth", period, locale],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(period));

      const { data, error } = await supabase
        .from("ministry_members")
        .select("joined_date")
        .gte("joined_date", formatDateInputValue(startDate))
        .lte("joined_date", formatDateInputValue(endDate))
        .order("joined_date");


      if (error) throw error;

      const monthCounts: { [key: string]: number } = {};
      const current = new Date(startDate);

      while (current <= endDate) {
        const monthStr = current.toLocaleDateString(locale, {
          month: "short",
          year: "numeric",
        });
        monthCounts[monthStr] = 0;
        current.setMonth(current.getMonth() + 1);
      }

      data.forEach((item) => {
        const date = toSafeDate(item.joined_date) ?? new Date(item.joined_date);
        const monthStr = date.toLocaleDateString(locale, {
          month: "short",
          year: "numeric",
        });
        if (monthCounts[monthStr] !== undefined) {
          monthCounts[monthStr]++;
        }
      });


      return Object.entries(monthCounts).map(([month, new_members]) => ({
        month,
        new_members,
      }));
    },
  });

  const totalMembers = ministriesData.reduce((sum, m) => sum + m.member_count, 0);
  const activeMinistries = ministriesData.filter((m) => m.active_status === "active").length;
  const avgMembersPerMinistry = ministriesData.length > 0 
    ? Math.round(totalMembers / ministriesData.length) 
    : 0;

  const topMinistries = [...ministriesData]
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">{t("ministries.loading")}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/ministries")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("ministries.back")}
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {t("ministries.statsTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("ministries.statsSubtitle")}
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">{t("ministries.months3")}</SelectItem>
              <SelectItem value="6">{t("ministries.months6")}</SelectItem>
              <SelectItem value="12">{t("ministries.months12")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("ministries.totalMinistries")}
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ministriesData.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeMinistries} {t("ministries.active").toLowerCase()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("ministries.totalMembers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {t("ministries.inAllMinistries")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("ministries.avgPerMinistry")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMembersPerMinistry}</div>
              <p className="text-xs text-muted-foreground">
                {t("ministries.membersPerMinistry")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("ministries.newMembers")}
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyGrowth.reduce((sum, m) => sum + m.new_members, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("ministries.lastMonths").replace("{count}", period)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("ministries.top5Ministries")}</CardTitle>
              <CardDescription>{t("ministries.byMemberCount")}</CardDescription>
            </CardHeader>
            <CardContent>
              {topMinistries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMinistries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="member_count" name={t("ministries.members")} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">{t("ministries.noDataAvailable")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("ministries.roleDistribution")}</CardTitle>
              <CardDescription>{t("ministries.inAllMinistriesChart")}</CardDescription>
            </CardHeader>
            <CardContent>
              {roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.role}: ${entry.count}`}
                    >
                      {roleDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">{t("ministries.noDataAvailable")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ministries.monthlyGrowth")}</CardTitle>
            <CardDescription>
              {t("ministries.monthlyGrowthDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line
                    type="monotone"
                    dataKey="new_members"
                    name={t("ministries.newMembers")}
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">{t("ministries.noDataAvailable")}</p>
                </div>
            )}
          </CardContent>
        </Card>

        {/* All Ministries Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ministries.allMinistries")}</CardTitle>
            <CardDescription>{t("ministries.fullDetails")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ministriesData.map((ministry) => (
                <div
                  key={ministry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/ministries/details?ministryId=${ministry.id}`)}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{ministry.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("ministries.leader")}: {ministry.leader_name || t("ministries.none")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{ministry.member_count}</p>
                      <p className="text-xs text-muted-foreground">{t("ministries.members").toLowerCase()}</p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        ministry.active_status === "active"
                          ? "bg-success"
                          : "bg-muted-foreground"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
