import { useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, CalendarCheck, CalendarX, Users, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isPast, isFuture, isToday, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface EventsReportTabProps {
  selectedBranch: string;
}

export default function EventsReportTab({ selectedBranch }: EventsReportTabProps) {
  const currentDate = new Date();

  // Fetch attendance records to get event data
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["events-report-attendance", selectedBranch],
    queryFn: async () => {
      const startDate = format(subMonths(currentDate, 12), "yyyy-MM-dd");
      
      let query = supabase
        .from("attendance_records")
        .select(`*, member:members(first_name, last_name)`)
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

  // Group by event
  const events = useMemo(() => {
    const eventMap: Record<string, { 
      date: string; 
      type: string; 
      attendees: number; 
      memberNames: string[];
    }> = {};

    attendanceRecords.forEach(r => {
      const key = `${r.event_date}-${r.event_type}`;
      if (!eventMap[key]) {
        eventMap[key] = {
          date: r.event_date,
          type: r.event_type,
          attendees: 0,
          memberNames: [],
        };
      }
      eventMap[key].attendees++;
      if (r.member) {
        eventMap[key].memberNames.push(`${r.member.first_name} ${r.member.last_name}`);
      }
    });

    return Object.values(eventMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords]);

  // Stats
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const totalAttendees = events.reduce((sum, e) => sum + e.attendees, 0);
    const avgAttendees = totalEvents > 0 ? totalAttendees / totalEvents : 0;
    const upcomingEvents = events.filter(e => isFuture(parseISO(e.date))).length;

    return { totalEvents, totalAttendees, avgAttendees, upcomingEvents };
  }, [events]);

  // Events by type
  const eventsByType = useMemo(() => {
    const breakdown: Record<string, { count: number; attendees: number }> = {};
    
    events.forEach(e => {
      if (!breakdown[e.type]) {
        breakdown[e.type] = { count: 0, attendees: 0 };
      }
      breakdown[e.type].count++;
      breakdown[e.type].attendees += e.attendees;
    });

    const labels: Record<string, string> = {
      sunday_service: "Service Dimanche",
      bible_study: "Étude Biblique",
      prayer_meeting: "Réunion Prière",
      youth_group: "Groupe Jeunesse",
      other: "Autre",
    };

    return Object.entries(breakdown).map(([type, data], index) => ({
      name: labels[type] || type,
      events: data.count,
      attendees: data.attendees,
      avgAttendees: data.count > 0 ? Math.round(data.attendees / data.count) : 0,
      color: COLORS[index % COLORS.length],
    }));
  }, [events]);

  // Monthly events count
  const monthlyEvents = useMemo(() => {
    const months: Record<string, { events: number; attendees: number }> = {};
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthKey = format(date, "yyyy-MM");
      months[monthKey] = { events: 0, attendees: 0 };
    }

    events.forEach(e => {
      const monthKey = format(parseISO(e.date), "yyyy-MM");
      if (months[monthKey]) {
        months[monthKey].events++;
        months[monthKey].attendees += e.attendees;
      }
    });

    return Object.entries(months).map(([key, value]) => ({
      month: format(parseISO(key + "-01"), "MMM yy", { locale: fr }),
      events: value.events,
      attendees: value.attendees,
    }));
  }, [events]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Events list
    const eventsSheet = XLSX.utils.json_to_sheet(events.map(e => ({
      Date: format(parseISO(e.date), "dd/MM/yyyy"),
      Type: e.type,
      Participants: e.attendees,
    })));
    XLSX.utils.book_append_sheet(wb, eventsSheet, "Événements");

    // By type
    const typeSheet = XLSX.utils.json_to_sheet(eventsByType.map(t => ({
      Type: t.name,
      "Nb Événements": t.events,
      "Total Participants": t.attendees,
      "Moy Participants": t.avgAttendees,
    })));
    XLSX.utils.book_append_sheet(wb, typeSheet, "Par Type");

    XLSX.writeFile(wb, `rapport-evenements-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Rapport des Événements", 14, 22);
    doc.setFontSize(12);
    doc.text(`Date: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    // Stats
    doc.setFontSize(14);
    doc.text("Statistiques", 14, 42);
    doc.setFontSize(11);
    doc.text(`Total Événements: ${stats.totalEvents}`, 14, 50);
    doc.text(`Total Participations: ${stats.totalAttendees}`, 14, 56);
    doc.text(`Moyenne par événement: ${stats.avgAttendees.toFixed(0)}`, 14, 62);

    // Events table
    autoTable(doc, {
      startY: 74,
      head: [["Date", "Type", "Participants"]],
      body: events.slice(0, 30).map(e => [
        format(parseISO(e.date), "dd/MM/yyyy"),
        e.type,
        e.attendees,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`rapport-evenements-${format(currentDate, "yyyy-MM-dd")}.pdf`);
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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Événements</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participations</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne/Événement</CardTitle>
            <CalendarCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAttendees.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Types d'Événements</CardTitle>
            <CalendarX className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventsByType.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Événements par Mois</CardTitle>
            <CardDescription>Nombre d'événements et participants (12 derniers mois)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyEvents}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="events" name="Événements" fill="hsl(var(--primary))" />
                  <Bar yAxisId="right" dataKey="attendees" name="Participants" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={eventsByType} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={60} 
                    outerRadius={90} 
                    dataKey="events" 
                    label={({ name, events }) => `${name}: ${events}`}
                  >
                    {eventsByType.map((entry, index) => (
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

      {/* Events by Type Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques par Type d'Événement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Événements</TableHead>
                <TableHead className="text-right">Total Participants</TableHead>
                <TableHead className="text-right">Moy. Participants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eventsByType.map((type) => (
                <TableRow key={type.name}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-right">{type.events}</TableCell>
                  <TableCell className="text-right">{type.attendees}</TableCell>
                  <TableCell className="text-right font-semibold">{type.avgAttendees}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Événements Récents</CardTitle>
          <CardDescription>Liste des derniers événements enregistrés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Participants</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.slice(0, 15).map((event, i) => {
                const eventDate = parseISO(event.date);
                const status = isPast(eventDate) ? "passed" : isToday(eventDate) ? "today" : "upcoming";
                
                return (
                  <TableRow key={i}>
                    <TableCell>{format(eventDate, "dd/MM/yyyy")}</TableCell>
                    <TableCell>{eventTypeLabels[event.type] || event.type}</TableCell>
                    <TableCell className="text-right font-semibold">{event.attendees}</TableCell>
                    <TableCell>
                      <Badge variant={status === "passed" ? "secondary" : status === "today" ? "default" : "outline"}>
                        {status === "passed" ? "Passé" : status === "today" ? "Aujourd'hui" : "À venir"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
