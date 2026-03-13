import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Users } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { format, subMonths, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getArrivalStatus, formatScanTime, getStatusTranslationKey,
  getStatusBadgeVariant,
} from "@/lib/attendanceStatus";

interface MemberArrivalStatsProps {
  memberId: string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    title: "Rapport d'Arrivées",
    subtitle: "Ponctualité du membre aux événements",
    totalScans: "Total Scans",
    early: "En avance",
    onTime: "À l'heure",
    late: "En retard",
    noEventTime: "Sans heure",
    period: "Période",
    lastWeek: "Dernière semaine",
    lastMonth: "Dernier mois",
    last3Months: "3 derniers mois",
    last6Months: "6 derniers mois",
    event: "Événement",
    eventDate: "Date",
    eventTime: "Heure prévue",
    scanTime: "Heure d'arrivée",
    arrivalStatus: "Statut",
    noRecords: "Aucun enregistrement trouvé pour cette période.",
    loading: "Chargement...",
    all: "Tous",
  },
  en: {
    title: "Arrival Report",
    subtitle: "Member punctuality to events",
    totalScans: "Total Scans",
    early: "Early",
    onTime: "On Time",
    late: "Late",
    noEventTime: "No time",
    period: "Period",
    lastWeek: "Last week",
    lastMonth: "Last month",
    last3Months: "Last 3 months",
    last6Months: "Last 6 months",
    event: "Event",
    eventDate: "Date",
    eventTime: "Scheduled time",
    scanTime: "Arrival time",
    arrivalStatus: "Status",
    noRecords: "No records found for this period.",
    loading: "Loading...",
    all: "All",
  },
  ht: {
    title: "Rapò Arive",
    subtitle: "Ponktyalite manm nan evènman yo",
    totalScans: "Total Eskanaj",
    early: "Bonè",
    onTime: "Alè",
    late: "An reta",
    noEventTime: "Pa gen lè",
    period: "Peryòd",
    lastWeek: "Dènye semèn",
    lastMonth: "Dènye mwa",
    last3Months: "3 dènye mwa",
    last6Months: "6 dènye mwa",
    event: "Evènman",
    eventDate: "Dat",
    eventTime: "Lè prevwa",
    scanTime: "Lè arive",
    arrivalStatus: "Estati",
    noRecords: "Pa gen anrejistreman pou peryòd sa a.",
    loading: "Chajman...",
    all: "Tout",
  },
};

export default function MemberArrivalStats({ memberId }: MemberArrivalStatsProps) {
  const { language } = useLanguage();
  const lt = (key: string) => translations[language]?.[key] || key;

  const [periodFilter, setPeriodFilter] = useState("3months");
  const [statusFilter, setStatusFilter] = useState("all");

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "1week": return subWeeks(now, 1);
      case "1month": return subMonths(now, 1);
      case "3months": return subMonths(now, 3);
      case "6months": return subMonths(now, 6);
      default: return subMonths(now, 3);
    }
  }, [periodFilter]);

  const { data: records, isLoading } = useQuery({
    queryKey: ["member-arrival-report", memberId, periodFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          id, event_date, event_type, marked_at, scan_method,
          event:events!attendance_records_event_id_fkey(id, name, event_time)
        `)
        .eq("member_id", memberId)
        .gte("event_date", format(periodStart, "yyyy-MM-dd"))
        .order("marked_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        eventTime: r.event?.event_time || null,
        eventName: r.event?.name || r.event_type,
        scanTime: formatScanTime(r.marked_at),
        arrivalStatus: getArrivalStatus(r.marked_at, r.event?.event_time),
      }));
    },
    enabled: !!memberId,
  });

  const filtered = useMemo(() => {
    if (!records) return [];
    if (statusFilter === "all") return records;
    return records.filter((r) => r.arrivalStatus === statusFilter);
  }, [records, statusFilter]);

  const stats = useMemo(() => {
    if (!records) return { total: 0, early: 0, onTime: 0, late: 0, noStatus: 0 };
    return {
      total: records.length,
      early: records.filter((r) => r.arrivalStatus === "early").length,
      onTime: records.filter((r) => r.arrivalStatus === "onTime").length,
      late: records.filter((r) => r.arrivalStatus === "late").length,
      noStatus: records.filter((r) => !r.arrivalStatus).length,
    };
  }, [records]);

  const dateFmt = language === "en" ? undefined : fr;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {lt("title")}
            </CardTitle>
            <CardDescription>{lt("subtitle")}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="1week">{lt("lastWeek")}</SelectItem>
                <SelectItem value="1month">{lt("lastMonth")}</SelectItem>
                <SelectItem value="3months">{lt("last3Months")}</SelectItem>
                <SelectItem value="6months">{lt("last6Months")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">{lt("all")}</SelectItem>
                <SelectItem value="early">{lt("early")}</SelectItem>
                <SelectItem value="onTime">{lt("onTime")}</SelectItem>
                <SelectItem value="late">{lt("late")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{lt("totalScans")}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.early}</p>
            <p className="text-xs text-muted-foreground">{lt("early")}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.onTime}</p>
            <p className="text-xs text-muted-foreground">{lt("onTime")}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xl font-bold text-destructive">{stats.late}</p>
            <p className="text-xs text-muted-foreground">{lt("late")}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xl font-bold text-muted-foreground">{stats.noStatus}</p>
            <p className="text-xs text-muted-foreground">{lt("noEventTime")}</p>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">{lt("loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground/20" />
            <p className="text-muted-foreground">{lt("noRecords")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt("event")}</TableHead>
                  <TableHead>{lt("eventDate")}</TableHead>
                  <TableHead>{lt("eventTime")}</TableHead>
                  <TableHead>{lt("scanTime")}</TableHead>
                  <TableHead>{lt("arrivalStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.eventName}</TableCell>
                    <TableCell>
                      {format(new Date(r.event_date), "dd MMM yyyy", { locale: dateFmt })}
                    </TableCell>
                    <TableCell>{r.eventTime ? r.eventTime.substring(0, 5) : "—"}</TableCell>
                    <TableCell>{r.scanTime || "—"}</TableCell>
                    <TableCell>
                      {r.arrivalStatus ? (
                        <Badge variant={getStatusBadgeVariant(r.arrivalStatus)}>
                          {lt(r.arrivalStatus === "onTime" ? "onTime" : r.arrivalStatus)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
