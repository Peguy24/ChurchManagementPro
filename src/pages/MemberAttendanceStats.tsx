import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowLeft, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
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
} from "recharts";

interface Member {
  id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  event_date: string;
  event_type: string;
}

interface MonthlyStats {
  month: string;
  present: number;
  total: number;
}

interface EventTypeStats {
  type: string;
  count: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--success))", "hsl(var(--warning))"];

export default function MemberAttendanceStats() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const memberId = searchParams.get("memberId");

  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [eventTypeData, setEventTypeData] = useState<EventTypeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6"); // 6 months by default

  useEffect(() => {
    loadAllMembers();
  }, []);

  useEffect(() => {
    if (memberId) {
      loadMemberData(memberId);
    }
  }, [memberId, period]);

  const loadAllMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      setAllMembers(data || []);
    } catch (error) {
      console.error("Erreur lors du chargement des membres:", error);
    }
  };

  const loadMemberData = async (id: string) => {
    try {
      setLoading(true);

      // Load member info
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("id", id)
        .single();

      if (memberError) throw memberError;
      setMember(memberData);

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(period));

      // Load attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance_records")
        .select("event_date, event_type")
        .eq("member_id", id)
        .gte("event_date", startDate.toISOString().split("T")[0])
        .lte("event_date", endDate.toISOString().split("T")[0])
        .order("event_date");

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);

      // Process monthly statistics
      processMonthlyStats(attendanceData || [], startDate, endDate);
      processEventTypeStats(attendanceData || []);
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyStats = (records: AttendanceRecord[], start: Date, end: Date) => {
    const months: MonthlyStats[] = [];
    const current = new Date(start);

    while (current <= end) {
      const monthStr = current.toLocaleDateString("fr-FR", {
        month: "short",
        year: "numeric",
      });

      const monthRecords = records.filter((r) => {
        const recordDate = new Date(r.event_date);
        return (
          recordDate.getMonth() === current.getMonth() &&
          recordDate.getFullYear() === current.getFullYear()
        );
      });

      months.push({
        month: monthStr,
        present: monthRecords.length,
        total: monthRecords.length, // Simplified - could add expected events
      });

      current.setMonth(current.getMonth() + 1);
    }

    setMonthlyData(months);
  };

  const processEventTypeStats = (records: AttendanceRecord[]) => {
    const typeCounts: { [key: string]: number } = {};

    records.forEach((record) => {
      typeCounts[record.event_type] = (typeCounts[record.event_type] || 0) + 1;
    });

    const stats = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
    }));

    setEventTypeData(stats);
  };

  const calculateAttendanceRate = () => {
    if (!attendanceRecords.length) return 0;
    // Simplified calculation - you can enhance this based on total expected events
    return Math.round((attendanceRecords.length / (parseInt(period) * 4)) * 100);
  };

  const calculateTrend = () => {
    if (monthlyData.length < 2) return 0;
    const lastMonth = monthlyData[monthlyData.length - 1].present;
    const previousMonth = monthlyData[monthlyData.length - 2].present;
    return lastMonth - previousMonth;
  };

  const handleMemberChange = (newMemberId: string) => {
    navigate(`/attendance/stats?memberId=${newMemberId}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </Layout>
    );
  }

  if (!member) {
    return (
      <Layout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate("/attendance")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Aucun membre sélectionné</CardTitle>
              <CardDescription>
                Veuillez sélectionner un membre pour voir ses statistiques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleMemberChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre" />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const attendanceRate = calculateAttendanceRate();
  const trend = calculateTrend();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/attendance")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Statistiques de Présence
              </h2>
              <p className="text-muted-foreground">
                {member.first_name} {member.last_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={memberId || ""} onValueChange={handleMemberChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 mois</SelectItem>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taux de Présence
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRate}%</div>
              <p className="text-xs text-muted-foreground">
                {attendanceRecords.length} présences sur {period} mois
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tendance</CardTitle>
              {trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trend >= 0 ? "+" : ""}
                {trend}
              </div>
              <p className="text-xs text-muted-foreground">
                vs mois précédent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Événements Assistés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceRecords.length}</div>
              <div className="flex gap-1 mt-2">
                {eventTypeData.slice(0, 3).map((event) => (
                  <Badge key={event.type} variant="secondary" className="text-xs">
                    {event.type}: {event.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
            <CardDescription>
              Présence aux événements par mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
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
                      color: "hsl(var(--foreground))"
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="present"
                    name="Présences"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Aucune donnée disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Par Type d'Événement</CardTitle>
              <CardDescription>Répartition des présences</CardDescription>
            </CardHeader>
            <CardContent>
              {eventTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.type}: ${entry.count}`}
                    >
                      {eventTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        color: "hsl(var(--foreground))"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparaison par Type</CardTitle>
              <CardDescription>Nombre de présences</CardDescription>
            </CardHeader>
            <CardContent>
              {eventTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={eventTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="type" 
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
                        color: "hsl(var(--foreground))"
                      }}
                    />
                    <Bar dataKey="count" name="Présences" fill="hsl(var(--secondary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">Aucune donnée disponible</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
