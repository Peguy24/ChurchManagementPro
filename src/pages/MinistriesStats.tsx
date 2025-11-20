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

interface RoleDistribution {
  role: string;
  count: number;
}

interface MonthlyGrowth {
  month: string;
  new_members: number;
}

export default function MinistriesStats() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("6"); // 6 months by default

  // Fetch all ministries with member counts
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

      // Get member counts for each ministry
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

  // Fetch role distribution
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

  // Fetch monthly growth
  const { data: monthlyGrowth = [] } = useQuery({
    queryKey: ["ministry-growth", period],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(period));

      const { data, error } = await supabase
        .from("ministry_members")
        .select("joined_date")
        .gte("joined_date", startDate.toISOString().split("T")[0])
        .lte("joined_date", endDate.toISOString().split("T")[0])
        .order("joined_date");

      if (error) throw error;

      // Group by month
      const monthCounts: { [key: string]: number } = {};
      const current = new Date(startDate);

      while (current <= endDate) {
        const monthStr = current.toLocaleDateString("fr-FR", {
          month: "short",
          year: "numeric",
        });
        monthCounts[monthStr] = 0;
        current.setMonth(current.getMonth() + 1);
      }

      data.forEach((item) => {
        const date = new Date(item.joined_date);
        const monthStr = date.toLocaleDateString("fr-FR", {
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

  // Top 5 ministries by member count
  const topMinistries = [...ministriesData]
    .sort((a, b) => b.member_count - a.member_count)
    .slice(0, 5);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Chargement...</p>
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
              Retour
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Estatistik Ministè yo
              </h2>
              <p className="text-muted-foreground">
                Analize pèfòmans ak kwasans ministè yo
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 mwa</SelectItem>
              <SelectItem value="6">6 mwa</SelectItem>
              <SelectItem value="12">12 mwa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Ministè
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ministriesData.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeMinistries} aktif
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Manm
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Nan tout ministè yo
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mwayèn pa Ministè
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgMembersPerMinistry}</div>
              <p className="text-xs text-muted-foreground">
                manm pa ministè
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Nouvo Manm
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyGrowth.reduce((sum, m) => sum + m.new_members, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Dènye {period} mwa
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Members per Ministry */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Ministè</CardTitle>
              <CardDescription>Pa kantite manm</CardDescription>
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
                    <Bar dataKey="member_count" name="Manm" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">Okenn done disponib</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribisyon Wòl</CardTitle>
              <CardDescription>Nan tout ministè yo</CardDescription>
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
                  <p className="text-muted-foreground">Okenn done disponib</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Kwasans Mansyèl</CardTitle>
            <CardDescription>
              Nouvo manm ki antre nan ministè yo pa mwa
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
                    name="Nouvo Manm"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--success))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Okenn done disponib</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Ministries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tout Ministè yo</CardTitle>
            <CardDescription>Detay konplè</CardDescription>
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
                      Responsab: {ministry.leader_name || "Okenn"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{ministry.member_count}</p>
                      <p className="text-xs text-muted-foreground">manm</p>
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
