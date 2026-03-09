import { useMemo, useState } from "react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Calendar, CalendarCheck, CalendarX, Users, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, isPast, isFuture, isToday, subMonths } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

interface EventsReportTabProps {
  selectedBranch: string;
}

export default function EventsReportTab({ selectedBranch }: EventsReportTabProps) {
  const { t, language } = useLanguage();
  const currentDate = new Date();
  const [periodMonths, setPeriodMonths] = useState<number>(12);
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const er = (key: string) => t(`layout.eventsReport.${key}`);

  const eventTypeLabels: Record<string, string> = {
    sunday_service: er("sundayService"),
    bible_study: er("bibleStudy"),
    prayer_meeting: er("prayerMeeting"),
    youth_group: er("youthGroup"),
    other: er("other"),
  };

  // Fetch attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["events-report-attendance", selectedBranch, periodMonths],
    queryFn: async () => {
      const startDate = format(subMonths(currentDate, periodMonths), "yyyy-MM-dd");
      
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

    return Object.entries(breakdown).map(([type, data], index) => ({
      name: eventTypeLabels[type] || type,
      events: data.count,
      attendees: data.attendees,
      avgAttendees: data.count > 0 ? Math.round(data.attendees / data.count) : 0,
      color: COLORS[index % COLORS.length],
    }));
  }, [events]);

  // Monthly events count
  const monthlyEvents = useMemo(() => {
    const months: Record<string, { events: number; attendees: number }> = {};
    
    for (let i = periodMonths - 1; i >= 0; i--) {
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
      month: format(parseISO(key + "-01"), "MMM yy", { locale: dateLocale }),
      events: value.events,
      attendees: value.attendees,
    }));
  }, [events, periodMonths, dateLocale]);

  // Export functions
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const eventsSheet = XLSX.utils.json_to_sheet(events.map(e => ({
      [er("date")]: format(parseISO(e.date), "dd/MM/yyyy"),
      [er("type")]: eventTypeLabels[e.type] || e.type,
      [er("participants")]: e.attendees,
    })));
    XLSX.utils.book_append_sheet(wb, eventsSheet, er("events"));

    const typeSheet = XLSX.utils.json_to_sheet(eventsByType.map(t => ({
      [er("type")]: t.name,
      [er("events")]: t.events,
      [er("totalParticipants")]: t.attendees,
      [er("avgParticipants")]: t.avgAttendees,
    })));
    XLSX.utils.book_append_sheet(wb, typeSheet, er("statsByType"));

    XLSX.writeFile(wb, `events-report-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(er("reportTitle"), 14, 22);
    doc.setFontSize(12);
    doc.text(`${er("date")}: ${format(currentDate, "dd/MM/yyyy")}`, 14, 30);

    doc.setFontSize(11);
    doc.text(`${er("totalEvents")}: ${stats.totalEvents}`, 14, 42);
    doc.text(`${er("totalParticipations")}: ${stats.totalAttendees}`, 14, 48);
    doc.text(`${er("avgPerEvent")}: ${stats.avgAttendees.toFixed(0)}`, 14, 54);

    autoTable(doc, {
      startY: 66,
      head: [[er("date"), er("type"), er("participants")]],
      body: events.slice(0, 30).map(e => [
        format(parseISO(e.date), "dd/MM/yyyy"),
        eventTypeLabels[e.type] || e.type,
        e.attendees,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`events-report-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const periodOptions = [
    { value: "1", label: er("lastMonth") },
    { value: "3", label: er("last3Months") },
    { value: "6", label: er("last6Months") },
    { value: "12", label: er("last12Months") },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={String(periodMonths)} onValueChange={(v) => setPeriodMonths(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={er("period")} />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
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
            <CardTitle className="text-sm font-medium">{er("totalEvents")}</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{er("totalParticipations")}</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttendees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{er("avgPerEvent")}</CardTitle>
            <CalendarCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgAttendees.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{er("eventTypes")}</CardTitle>
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
            <CardTitle>{er("eventsByMonth")}</CardTitle>
            <CardDescription>{er("eventsByMonthDesc")}</CardDescription>
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
                  <Bar yAxisId="left" dataKey="events" name={er("events")} fill="hsl(var(--primary))" />
                  <Bar yAxisId="right" dataKey="attendees" name={er("participants")} fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{er("distributionByType")}</CardTitle>
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
          <CardTitle>{er("statsByType")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{er("type")}</TableHead>
                <TableHead className="text-right">{er("events")}</TableHead>
                <TableHead className="text-right">{er("totalParticipants")}</TableHead>
                <TableHead className="text-right">{er("avgParticipants")}</TableHead>
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
          <CardTitle>{er("recentEvents")}</CardTitle>
          <CardDescription>{er("recentEventsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{er("date")}</TableHead>
                <TableHead>{er("type")}</TableHead>
                <TableHead className="text-right">{er("participants")}</TableHead>
                <TableHead>{er("status")}</TableHead>
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
                        {status === "passed" ? er("passed") : status === "today" ? er("today") : er("upcoming")}
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
