import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Calendar, TrendingUp, Percent, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface AttendanceReportTabProps {
  selectedBranch: string;
}

export default function AttendanceReportTab({ selectedBranch }: AttendanceReportTabProps) {
  const currentDate = new Date();
  const [period, setPeriod] = useState("6");

  // Fetch attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-report", selectedBranch, period],
    queryFn: async () => {
      const startDate = format(subMonths(startOfMonth(currentDate), parseInt(period) - 1), "yyyy-MM-dd");

      let query = supabase
        .from("attendance_records")
        .select(`*, member:members(first_name, last_name, status)`)
        .gte("event_date", startDate)
        .order("event_date", { ascending: false });

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch active members count
  const { data: activeMembers = [] } = useQuery({
    queryKey: ["active-members-count", selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id")
        .eq("status", "active");

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalActiveMembers = activeMembers.length;

  // Stats
  const stats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const uniqueDates = new Set(attendanceRecords.map(r => r.event_date)).size;
    const avgPerEvent = uniqueDates > 0 ? totalRecords / uniqueDates : 0;
    const avgPercentage = totalActiveMembers > 0 ? (avgPerEvent / totalActiveMembers) * 100 : 0;

    return { totalRecords, uniqueDates, avgPerEvent, avgPercentage };
  }, [attendanceRecords, totalActiveMembers]);

  // Attendance by event type
  const eventTypeData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    attendanceRecords.forEach(r => {
      const type = r.event_type || "other";
      if (!breakdown[type]) breakdown[type] = 0;
      breakdown[type]++;
    });
    const labels: Record<string, string> = {
      sunday_service: "Service Dimanche",
      bible_study: "Étude Biblique",
      prayer_meeting: "Réunion Prière",
      youth_group: "Groupe Jeunesse",
      other: "Autre",
    };
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: labels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [attendanceRecords]);

  // Monthly attendance trend
  const monthlyData = useMemo(() => {
    const months: Record<string, { total: number; events: Set<string> }> = {};
    
    for (let i = parseInt(period) - 1; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, "yyyy-MM");
      months[monthKey] = { total: 0, events: new Set() };
    }

    attendanceRecords.forEach(r => {
      const monthKey = format(parseISO(r.event_date), "yyyy-MM");
      if (months[monthKey]) {
        months[monthKey].total++;
        months[monthKey].events.add(r.event_date);
      }
    });

    return Object.entries(months).map(([key, value]) => ({
      month: format(parseISO(key + "-01"), "MMM yy", { locale: fr }),
      presences: value.total,
      events: value.events.size,
      avgPerEvent: value.events.size > 0 ? Math.round(value.total / value.events.size) : 0,
    }));
  }, [attendanceRecords, period]);

  // Recent events summary
  const recentEvents = useMemo(() => {
    const eventMap: Record<string, { date: string; type: string; count: number }> = {};
    
    attendanceRecords.forEach(r => {
      const key = `${r.event_date}-${r.event_type}`;
      if (!eventMap[key]) {
        eventMap[key] = { date: r.event_date, type: r.event_type, count: 0 };
      }
      eventMap[key].count++;
    });

    return Object.values(eventMap)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [attendanceRecords]);

  // Top attendees
  const topAttendees = useMemo(() => {
    const memberCount: Record<string, { name: string; count: number }> = {};
    
    attendanceRecords.forEach(r => {
      if (r.member) {
        const id = r.member_id;
        if (!memberCount[id]) {
          memberCount[id] = { name: `${r.member.first_name} ${r.member.last_name}`, count: 0 };
        }
        memberCount[id].count++;
      }
    });

    return Object.values(memberCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [attendanceRecords]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Monthly summary
    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData.map(m => ({
      Mois: m.month,
      Présences: m.presences,
      Événements: m.events,
      "Moyenne/Événement": m.avgPerEvent,
    })));
    XLSX.utils.book_append_sheet(wb, monthlySheet, "Résumé Mensuel");

    // By event type
    const eventSheet = XLSX.utils.json_to_sheet(eventTypeData.map(e => ({
      "Type d'événement": e.name,
      Présences: e.value,
    })));
    XLSX.utils.book_append_sheet(wb, eventSheet, "Par Type");

    // Top attendees
    const topSheet = XLSX.utils.json_to_sheet(topAttendees.map((a, i) => ({
      Rang: i + 1,
      Membre: a.name,
      Présences: a.count,
    })));
    XLSX.utils.book_append_sheet(wb, topSheet, "Top Participants");

    XLSX.writeFile(wb, `rapport-presences-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Rapport de Présence", 14, 22);
    doc.setFontSize(12);
    doc.text(`Période: ${period} derniers mois`, 14, 30);
    doc.text(`Date: ${format(currentDate, "dd/MM/yyyy")}`, 14, 36);

    // Stats
    doc.setFontSize(14);
    doc.text("Statistiques", 14, 48);
    doc.setFontSize(11);
    doc.text(`Total Présences: ${stats.totalRecords}`, 14, 56);
    doc.text(`Nombre d'Événements: ${stats.uniqueDates}`, 14, 62);
    doc.text(`Moyenne par événement: ${stats.avgPerEvent.toFixed(0)}`, 14, 68);
    doc.text(`Taux de participation: ${stats.avgPercentage.toFixed(1)}%`, 14, 74);

    // Monthly table
    autoTable(doc, {
      startY: 86,
      head: [["Mois", "Présences", "Événements", "Moy/Événement"]],
      body: monthlyData.map(m => [
        m.month,
        m.presences,
        m.events,
        m.avgPerEvent,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapport-presences-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const eventTypeLabels: Record<string, string> = {
    sunday_service: "Service Dimanche",
    bible_study: "Étude Biblique",
    prayer_meeting: "Réunion Prière",
    youth_group: "Groupe Jeunesse",
    other: "Autre",
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 derniers mois</SelectItem>
            <SelectItem value="6">6 derniers mois</SelectItem>
            <SelectItem value="12">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </Button>
        <Button variant="outline" onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Présences</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueDates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne/Événement</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPerEvent.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Participation</CardTitle>
            <Percent className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">sur {totalActiveMembers} membres actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Évolution Mensuelle</CardTitle>
            <CardDescription>Présences et événements par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="presences" name="Présences" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="avgPerEvent" name="Moy/Événement" stroke="hsl(var(--secondary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Par Type d'Événement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {eventTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events and Top Attendees */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Événements Récents</CardTitle>
            <CardDescription>Derniers événements avec présences</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Présents</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEvents.slice(0, 10).map((event, i) => (
                  <TableRow key={i}>
                    <TableCell>{format(parseISO(event.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{eventTypeLabels[event.type] || event.type}</TableCell>
                    <TableCell className="text-right font-semibold">{event.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Participants</CardTitle>
            <CardDescription>Membres les plus assidus</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead className="text-right">Présences</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAttendees.map((attendee, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell>{attendee.name}</TableCell>
                    <TableCell className="text-right font-semibold">{attendee.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
