import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { ArrowLeft, Clock, Download, Filter, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, subMonths, subWeeks, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getArrivalStatus, formatScanTime, getStatusTranslationKey,
  getStatusBadgeVariant, type ArrivalStatus,
} from "@/lib/attendanceStatus";
import * as XLSX from "xlsx";

export default function AttendanceArrivalReport() {
  const { t, language } = useLanguage();

  const navigate = useNavigate();
  const { tenantId } = useCurrentTenant();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("1month");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const periodStart = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "1week": return subWeeks(now, 1);
      case "1month": return subMonths(now, 1);
      case "3months": return subMonths(now, 3);
      case "6months": return subMonths(now, 6);
      default: return subMonths(now, 1);
    }
  }, [periodFilter]);

  const { data: records, isLoading } = useQuery({
    queryKey: ["arrival-report", tenantId, periodFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          id, event_date, event_type, marked_at, scan_method,
          member:members!attendance_records_member_id_fkey(id, first_name, last_name),
          event:events!attendance_records_event_id_fkey(id, name, event_time)
        `)
        .eq("tenant_id", tenantId)
        .gte("event_date", format(periodStart, "yyyy-MM-dd"))
        .order("marked_at", { ascending: false });

      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        memberName: r.member ? `${r.member.first_name} ${r.member.last_name}` : "—",
        eventTime: r.event?.event_time || null,
        eventName: r.event?.name || r.event_type,
        scanTime: formatScanTime(r.marked_at),
        arrivalStatus: getArrivalStatus(r.marked_at, r.event?.event_time),
      }));
    },
    enabled: !!tenantId,
  });

  // Unique events for filter
  const uniqueEvents = useMemo(() => {
    if (!records) return [];
    const set = new Map<string, string>();
    records.forEach((r) => {
      if (r.event?.id) set.set(r.event.id, r.eventName);
    });
    return Array.from(set, ([id, name]) => ({ id, name }));
  }, [records]);

  // Filtered records
  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      if (statusFilter !== "all" && r.arrivalStatus !== statusFilter) return false;
      if (eventFilter !== "all" && r.event?.id !== eventFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.memberName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, eventFilter, searchQuery]);

  // Stats
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

  const handleExport = () => {
    if (!filtered?.length) return;
    const rows = filtered.map((r) => ({
      [t("arrivalReport.memberName")]: r.memberName,
      [t("arrivalReport.event")]: r.eventName,
      [t("arrivalReport.eventDate")]: r.event_date,
      [t("arrivalReport.eventTime")]: r.eventTime ? r.eventTime.substring(0, 5) : "—",
      [t("attendance.scanTime")]: r.scanTime,
      [t("attendance.arrivalStatus")]: r.arrivalStatus ? t(getStatusTranslationKey(r.arrivalStatus)) : "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("arrivalReport.title"));
    XLSX.writeFile(wb, `arrival-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/attendance")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Clock className="h-6 w-6 text-primary" />
                {t("arrivalReport.title")}
              </h1>
              <p className="text-sm text-muted-foreground">{t("arrivalReport.subtitle")}</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={!filtered?.length} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t("common.download")} Excel
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">{t("arrivalReport.totalScans")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.early}</p>
              <p className="text-xs text-muted-foreground">{t("attendance.early")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.onTime}</p>
              <p className="text-xs text-muted-foreground">{t("attendance.onTime")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-destructive">{stats.late}</p>
              <p className="text-xs text-muted-foreground">{t("attendance.late")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.noStatus}</p>
              <p className="text-xs text-muted-foreground">{t("arrivalReport.noEventTime")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t("common.filter")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("arrivalReport.period")}</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="1week">{t("arrivalReport.lastWeek")}</SelectItem>
                    <SelectItem value="1month">{t("arrivalReport.lastMonth")}</SelectItem>
                    <SelectItem value="3months">{t("arrivalReport.last3Months")}</SelectItem>
                    <SelectItem value="6months">{t("arrivalReport.last6Months")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("attendance.arrivalStatus")}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    <SelectItem value="early">{t("attendance.early")}</SelectItem>
                    <SelectItem value="onTime">{t("attendance.onTime")}</SelectItem>
                    <SelectItem value="late">{t("attendance.late")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("arrivalReport.event")}</label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {uniqueEvents.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("arrivalReport.searchMember")}</label>
                <Input
                  placeholder={t("arrivalReport.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("arrivalReport.detailedList")} ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-2 text-muted-foreground/20" />
                <p className="text-muted-foreground">{t("arrivalReport.noRecords")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("arrivalReport.memberName")}</TableHead>
                      <TableHead>{t("arrivalReport.event")}</TableHead>
                      <TableHead>{t("arrivalReport.eventDate")}</TableHead>
                      <TableHead>{t("arrivalReport.eventTime")}</TableHead>
                      <TableHead>{t("attendance.scanTime")}</TableHead>
                      <TableHead>{t("attendance.arrivalStatus")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.memberName}</TableCell>
                        <TableCell>{r.eventName}</TableCell>
                        <TableCell>{r.event_date}</TableCell>
                        <TableCell>{r.eventTime ? r.eventTime.substring(0, 5) : "—"}</TableCell>
                        <TableCell>{r.scanTime || "—"}</TableCell>
                        <TableCell>
                          {r.arrivalStatus ? (
                            <Badge variant={getStatusBadgeVariant(r.arrivalStatus)}>
                              {t(getStatusTranslationKey(r.arrivalStatus))}
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
      </div>
    </Layout>
  );
}
