import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, TrendingUp, Users, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AttendanceDialog from "@/components/AttendanceDialog";

interface AttendanceRecord {
  event_type: string;
  event_date: string;
  total: number;
}

interface AttendanceStats {
  avgAttendance: number;
  totalEvents: number;
  highestAttendance: number;
  highestDate: string;
  percentageChange: number;
}

export default function Attendance() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats>({
    avgAttendance: 0,
    totalEvents: 0,
    highestAttendance: 0,
    highestDate: "",
    percentageChange: 0,
  });
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    loadAttendanceRecords();
    loadTotalMembers();
  }, []);

  const loadTotalMembers = async () => {
    try {
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (error) throw error;
      setTotalMembers(count || 0);
    } catch (error) {
      console.error("Error loading total members:", error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      
      // Get all attendance records
      const { data, error } = await supabase
        .from("attendance_records")
        .select("event_type, event_date")
        .order("event_date", { ascending: false });

      if (error) throw error;

      // Group by event and date to get totals
      const grouped = (data || []).reduce((acc: Record<string, AttendanceRecord>, record) => {
        const key = `${record.event_type}-${record.event_date}`;
        if (!acc[key]) {
          acc[key] = {
            event_type: record.event_type,
            event_date: record.event_date,
            total: 0,
          };
        }
        acc[key].total += 1;
        return acc;
      }, {});

      const records = Object.values(grouped);
      setAttendanceRecords(records);

      // Calculate stats
      if (records.length > 0) {
        const totals = records.map((r) => r.total);
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        const highest = Math.max(...totals);
        const highestRecord = records.find((r) => r.total === highest);

        // Get last 30 days for current period
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const currentPeriod = records.filter(
          (r) => new Date(r.event_date) >= thirtyDaysAgo
        );

        // Get previous 30 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const previousPeriod = records.filter(
          (r) =>
            new Date(r.event_date) >= sixtyDaysAgo &&
            new Date(r.event_date) < thirtyDaysAgo
        );

        const currentAvg =
          currentPeriod.length > 0
            ? currentPeriod.reduce((a, b) => a + b.total, 0) / currentPeriod.length
            : 0;
        const previousAvg =
          previousPeriod.length > 0
            ? previousPeriod.reduce((a, b) => a + b.total, 0) / previousPeriod.length
            : 0;

        const percentageChange =
          previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

        setStats({
          avgAttendance: Math.round(avg),
          totalEvents: records.length,
          highestAttendance: highest,
          highestDate: highestRecord?.event_date || "",
          percentageChange: Math.round(percentageChange),
        });
      }
    } catch (error) {
      console.error("Error loading attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Jesyon Prezans
            </h2>
            <p className="text-muted-foreground">
              Swiv prezans manm yo nan chak rankont
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Anrejistre Prezans
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Manm</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">Manm aktif</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Dènye Rankont
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {attendanceRecords.length > 0
                  ? attendanceRecords[0].total
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {attendanceRecords.length > 0
                  ? new Date(attendanceRecords[0].event_date).toLocaleDateString("fr-FR")
                  : "Pa gen rankont"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pousantaj Mwayèn
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalMembers > 0 && stats.avgAttendance > 0
                  ? Math.round((stats.avgAttendance / totalMembers) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.avgAttendance} / {totalMembers} an mwayèn
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prezans Mwayèn
              </CardTitle>
              <TrendingUp className={`h-4 w-4 ${stats.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgAttendance}</div>
              <p className="text-xs text-muted-foreground">
                {stats.percentageChange >= 0 ? '+' : ''}{stats.percentageChange}% vs peryòd pase
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Rankont
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">Total anrejistre</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pi Gwo Prezans
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highestAttendance}</div>
              <p className="text-xs text-muted-foreground">
                {stats.highestDate ? new Date(stats.highestDate).toLocaleDateString("fr-FR") : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Prezans Resan</CardTitle>
            <CardDescription>
              History prezans pou dènye rankont yo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evènman</TableHead>
                    <TableHead>Dat</TableHead>
                    <TableHead>Total Prezan</TableHead>
                    <TableHead>Pousantaj</TableHead>
                    <TableHead className="text-right">Aksyon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Ap chaje...
                      </TableCell>
                    </TableRow>
                  ) : attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Pa gen anrejistman prezans ankò.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.map((record, index) => {
                      const percentage = totalMembers > 0 
                        ? Math.round((record.total / totalMembers) * 100)
                        : 0;
                      
                      return (
                        <TableRow key={`${record.event_type}-${record.event_date}-${index}`}>
                          <TableCell className="font-medium">{record.event_type}</TableCell>
                          <TableCell>{new Date(record.event_date).toLocaleDateString("fr-FR")}</TableCell>
                          <TableCell>{record.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{percentage}%</span>
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate("/attendance/stats")}
                            >
                              Statistiques
                            </Button>
                          </TableCell>
                        </TableRow>
                       );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <AttendanceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={loadAttendanceRecords}
      />
    </Layout>
  );
}
