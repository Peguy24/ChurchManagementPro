import { useState, useEffect } from "react";
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
import { Calendar, Plus, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AttendanceDialog from "@/components/AttendanceDialog";

interface AttendanceRecord {
  event_type: string;
  event_date: string;
  total: number;
}

const mockAttendanceRecords = [
  {
    id: 1,
    event: "Sèvis Dimanch",
    date: "2025-01-14",
    total: 186,
    percentage: 75,
  },
  {
    id: 2,
    event: "Etid Biblik",
    date: "2025-01-16",
    total: 42,
    percentage: 17,
  },
  {
    id: 3,
    event: "Rankont Priyè",
    date: "2025-01-17",
    total: 68,
    percentage: 27,
  },
  {
    id: 4,
    event: "Sèvis Dimanch",
    date: "2025-01-07",
    total: 192,
    percentage: 77,
  },
];

const weeklyStats = [
  { day: "Lendi", count: 0 },
  { day: "Madi", count: 0 },
  { day: "Mèkredi", count: 42 },
  { day: "Jedi", count: 68 },
  { day: "Vandredi", count: 0 },
  { day: "Samdi", count: 0 },
  { day: "Dimanch", count: 186 },
];

export default function Attendance() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
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

      setAttendanceRecords(Object.values(grouped));
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

        {/* Weekly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Prezans Semèn Sa</CardTitle>
            <CardDescription>
              Total: 296 prezans • Mwayèn: 42 pa rankont
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weeklyStats.map((stat) => (
                <div
                  key={stat.day}
                  className="rounded-lg border bg-card p-4 text-center"
                >
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.day}
                  </p>
                  <p className="mt-2 text-2xl font-bold">{stat.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prezans Mwayèn
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72%</div>
              <p className="text-xs text-muted-foreground">
                +5% vs mwa pase
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
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">Mwa sa</p>
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
              <div className="text-2xl font-bold">192</div>
              <p className="text-xs text-muted-foreground">07 Janvye</p>
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
                    attendanceRecords.map((record, index) => (
                      <TableRow key={`${record.event_type}-${record.event_date}-${index}`}>
                        <TableCell className="font-medium">{record.event_type}</TableCell>
                        <TableCell>{record.event_date}</TableCell>
                        <TableCell>{record.total}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Detay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
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
