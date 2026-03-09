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
import { Users, Calendar, TrendingUp, Percent, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--warning))"];

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    totalAttendance: "Total Attendance",
    events: "Events",
    avgPerEvent: "Avg/Event",
    participationRate: "Participation Rate",
    onActiveMembers: "on {n} active members",
    monthlyTrend: "Monthly Trend",
    attendanceAndEvents: "Attendance and events by month",
    attendance: "Attendance",
    avgEvent: "Avg/Event",
    byEventType: "By Event Type",
    recentEvents: "Recent Events",
    lastEventsWithAttendance: "Last events with attendance",
    date: "Date",
    type: "Type",
    present: "Present",
    topAttendees: "Top Attendees",
    mostDedicatedMembers: "Most dedicated members",
    rank: "#",
    member: "Member",
    sundayService: "Sunday Service",
    bibleStudy: "Bible Study",
    prayerMeeting: "Prayer Meeting",
    youthGroup: "Youth Group",
    other: "Other",
    last3Months: "Last 3 months",
    last6Months: "Last 6 months",
    last12Months: "Last 12 months",
    monthlySummary: "Monthly Summary",
    month: "Month",
    byType: "By Type",
    eventType: "Event type",
    topParticipants: "Top Participants",
    attendanceReport: "Attendance Report",
    period: "Period",
    lastMonths: "last months",
    statistics: "Statistics",
    totalEvents: "Total Events",
    average: "Average per event",
  },
  fr: {
    totalAttendance: "Total Présences",
    events: "Événements",
    avgPerEvent: "Moyenne/Événement",
    participationRate: "Taux Participation",
    onActiveMembers: "sur {n} membres actifs",
    monthlyTrend: "Évolution Mensuelle",
    attendanceAndEvents: "Présences et événements par mois",
    attendance: "Présences",
    avgEvent: "Moy/Événement",
    byEventType: "Par Type d'Événement",
    recentEvents: "Événements Récents",
    lastEventsWithAttendance: "Derniers événements avec présences",
    date: "Date",
    type: "Type",
    present: "Présents",
    topAttendees: "Top Participants",
    mostDedicatedMembers: "Membres les plus assidus",
    rank: "#",
    member: "Membre",
    sundayService: "Service Dimanche",
    bibleStudy: "Étude Biblique",
    prayerMeeting: "Réunion Prière",
    youthGroup: "Groupe Jeunesse",
    other: "Autre",
    last3Months: "3 derniers mois",
    last6Months: "6 derniers mois",
    last12Months: "12 derniers mois",
    monthlySummary: "Résumé Mensuel",
    month: "Mois",
    byType: "Par Type",
    eventType: "Type d'événement",
    topParticipants: "Top Participants",
    attendanceReport: "Rapport de Présence",
    period: "Période",
    lastMonths: "derniers mois",
    statistics: "Statistiques",
    totalEvents: "Nombre d'Événements",
    average: "Moyenne par événement",
  },
  ht: {
    totalAttendance: "Total Prezans",
    events: "Evènman",
    avgPerEvent: "Mwayèn/Evènman",
    participationRate: "To Patisipasyon",
    onActiveMembers: "sou {n} manm aktif",
    monthlyTrend: "Evolisyon Chak Mwa",
    attendanceAndEvents: "Prezans ak evènman pa mwa",
    attendance: "Prezans",
    avgEvent: "Mwayèn/Evènman",
    byEventType: "Pa Tip Evènman",
    recentEvents: "Dènye Evènman",
    lastEventsWithAttendance: "Dènye evènman ak prezans",
    date: "Dat",
    type: "Tip",
    present: "Prezan",
    topAttendees: "Top Patisipan",
    mostDedicatedMembers: "Manm ki pi fidèl",
    rank: "#",
    member: "Manm",
    sundayService: "Sèvis Dimanch",
    bibleStudy: "Etid Biblik",
    prayerMeeting: "Reyinyon Lapriyè",
    youthGroup: "Gwoup Jèn",
    other: "Lòt",
    last3Months: "3 dènye mwa",
    last6Months: "6 dènye mwa",
    last12Months: "12 dènye mwa",
    monthlySummary: "Rezime Chak Mwa",
    month: "Mwa",
    byType: "Pa Tip",
    eventType: "Tip evènman",
    topParticipants: "Top Patisipan",
    attendanceReport: "Rapò Prezans",
    period: "Peryòd",
    lastMonths: "dènye mwa",
    statistics: "Estatistik",
    totalEvents: "Kantite Evènman",
    average: "Mwayèn pa evènman",
  },
};

interface AttendanceReportTabProps {
  selectedBranch: string;
}

export default function AttendanceReportTab({ selectedBranch }: AttendanceReportTabProps) {
  const { language } = useLanguage();
  const lt = localTranslations[language] || localTranslations.en;
  const currentDate = new Date();
  const [period, setPeriod] = useState("6");
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const eventTypeLabels: Record<string, string> = {
    sunday_service: lt.sundayService,
    bible_study: lt.bibleStudy,
    prayer_meeting: lt.prayerMeeting,
    youth_group: lt.youthGroup,
    other: lt.other,
  };

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

  const stats = useMemo(() => {
    const totalRecords = attendanceRecords.length;
    const uniqueDates = new Set(attendanceRecords.map(r => r.event_date)).size;
    const avgPerEvent = uniqueDates > 0 ? totalRecords / uniqueDates : 0;
    const avgPercentage = totalActiveMembers > 0 ? (avgPerEvent / totalActiveMembers) * 100 : 0;

    return { totalRecords, uniqueDates, avgPerEvent, avgPercentage };
  }, [attendanceRecords, totalActiveMembers]);

  const eventTypeData = useMemo(() => {
    const breakdown: Record<string, number> = {};
    attendanceRecords.forEach(r => {
      const type = r.event_type || "other";
      if (!breakdown[type]) breakdown[type] = 0;
      breakdown[type]++;
    });
    return Object.entries(breakdown).map(([name, value], index) => ({
      name: eventTypeLabels[name] || name,
      value,
      color: COLORS[index % COLORS.length],
    }));
  }, [attendanceRecords, lt]);

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
      month: format(parseISO(key + "-01"), "MMM yy", { locale: dateLocale }),
      presences: value.total,
      events: value.events.size,
      avgPerEvent: value.events.size > 0 ? Math.round(value.total / value.events.size) : 0,
    }));
  }, [attendanceRecords, period, dateLocale]);

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

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData.map(m => ({
      [lt.month]: m.month,
      [lt.attendance]: m.presences,
      [lt.events]: m.events,
      [lt.avgPerEvent]: m.avgPerEvent,
    })));
    XLSX.utils.book_append_sheet(wb, monthlySheet, lt.monthlySummary);

    const eventSheet = XLSX.utils.json_to_sheet(eventTypeData.map(e => ({
      [lt.eventType]: e.name,
      [lt.attendance]: e.value,
    })));
    XLSX.utils.book_append_sheet(wb, eventSheet, lt.byType);

    const topSheet = XLSX.utils.json_to_sheet(topAttendees.map((a, i) => ({
      [lt.rank]: i + 1,
      [lt.member]: a.name,
      [lt.attendance]: a.count,
    })));
    XLSX.utils.book_append_sheet(wb, topSheet, lt.topParticipants);

    XLSX.writeFile(wb, `attendance-report-${format(currentDate, "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(lt.attendanceReport, 14, 22);
    doc.setFontSize(12);
    doc.text(`${lt.period}: ${period} ${lt.lastMonths}`, 14, 30);
    doc.text(`${lt.date}: ${format(currentDate, "dd/MM/yyyy")}`, 14, 36);

    doc.setFontSize(14);
    doc.text(lt.statistics, 14, 48);
    doc.setFontSize(11);
    doc.text(`${lt.totalAttendance}: ${stats.totalRecords}`, 14, 56);
    doc.text(`${lt.totalEvents}: ${stats.uniqueDates}`, 14, 62);
    doc.text(`${lt.average}: ${stats.avgPerEvent.toFixed(0)}`, 14, 68);
    doc.text(`${lt.participationRate}: ${stats.avgPercentage.toFixed(1)}%`, 14, 74);

    autoTable(doc, {
      startY: 86,
      head: [[lt.month, lt.attendance, lt.events, lt.avgPerEvent]],
      body: monthlyData.map(m => [
        m.month,
        m.presences,
        m.events,
        m.avgPerEvent,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`attendance-report-${format(currentDate, "yyyy-MM-dd")}.pdf`);
  };

  const exportToCSV = () => {
    exportToCsv(
      monthlyData,
      [
        { key: "month", header: lt.month },
        { key: "presences", header: lt.attendance },
        { key: "events", header: lt.events },
        { key: "avgPerEvent", header: lt.avgPerEvent },
      ],
      `attendance-report-${format(currentDate, "yyyy-MM-dd")}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">{lt.last3Months}</SelectItem>
            <SelectItem value="6">{lt.last6Months}</SelectItem>
            <SelectItem value="12">{lt.last12Months}</SelectItem>
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
        <Button variant="outline" onClick={exportToCSV}>
          <FileDown className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.totalAttendance}</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.events}</CardTitle>
            <Calendar className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueDates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.avgPerEvent}</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPerEvent.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.participationRate}</CardTitle>
            <Percent className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgPercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">{lt.onActiveMembers.replace("{n}", String(totalActiveMembers))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{lt.monthlyTrend}</CardTitle>
            <CardDescription>{lt.attendanceAndEvents}</CardDescription>
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
                  <Line yAxisId="left" type="monotone" dataKey="presences" name={lt.attendance} stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="avgPerEvent" name={lt.avgEvent} stroke="hsl(var(--secondary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lt.byEventType}</CardTitle>
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
            <CardTitle>{lt.recentEvents}</CardTitle>
            <CardDescription>{lt.lastEventsWithAttendance}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt.date}</TableHead>
                  <TableHead>{lt.type}</TableHead>
                  <TableHead className="text-right">{lt.present}</TableHead>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lt.topAttendees}</CardTitle>
            <CardDescription>{lt.mostDedicatedMembers}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt.rank}</TableHead>
                  <TableHead>{lt.member}</TableHead>
                  <TableHead className="text-right">{lt.attendance}</TableHead>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
