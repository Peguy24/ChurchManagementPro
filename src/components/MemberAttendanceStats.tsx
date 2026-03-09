import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, TrendingUp, TrendingDown, Minus, Calendar, BarChart3, Clock } from "lucide-react";
import { formatScanTime, getArrivalStatus, getStatusTranslationKey, getStatusBadgeVariant } from "@/lib/attendanceStatus";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface MemberAttendanceStatsProps {
  memberId: string;
}

export default function MemberAttendanceStats({ memberId }: MemberAttendanceStatsProps) {
  const { t } = useLanguage();

  // Fetch attendance records for the last 6 months
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["member-attendance-stats", memberId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data, error } = await supabase
        .from("attendance_records")
        .select("event_date, event_type")
        .eq("member_id", memberId)
        .gte("event_date", format(sixMonthsAgo, "yyyy-MM-dd"))
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId,
  });

  // Fetch total events in the same period to calculate attendance rate
  const { data: totalEventsData } = useQuery({
    queryKey: ["total-events-stats", memberId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      // Get distinct event dates
      const { data, error } = await supabase
        .from("attendance_records")
        .select("event_date, event_type")
        .gte("event_date", format(sixMonthsAgo, "yyyy-MM-dd"));

      if (error) throw error;
      
      // Count unique events
      const uniqueEvents = new Set(data?.map(r => `${r.event_date}-${r.event_type}`));
      return uniqueEvents.size;
    },
    enabled: !!memberId,
  });

  // Calculate monthly stats
  const monthlyStats = (() => {
    if (!attendanceData) return [];

    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(now),
    });

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthAttendance = attendanceData.filter((record) => {
        const recordDate = parseISO(record.event_date);
        return recordDate >= monthStart && recordDate <= monthEnd;
      });

      return {
        month: format(month, "MMM", { locale: fr }),
        fullMonth: format(month, "MMMM yyyy", { locale: fr }),
        count: monthAttendance.length,
      };
    });
  })();

  // Calculate by event type
  const eventTypeStats = (() => {
    if (!attendanceData) return [];

    const typeCount: Record<string, number> = {};
    attendanceData.forEach((record) => {
      typeCount[record.event_type] = (typeCount[record.event_type] || 0) + 1;
    });

    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
    }));
  })();

  // Calculate trend
  const trend = (() => {
    if (monthlyStats.length < 2) return { direction: "stable", percentage: 0 };

    const lastMonth = monthlyStats[monthlyStats.length - 1]?.count || 0;
    const previousMonth = monthlyStats[monthlyStats.length - 2]?.count || 0;

    if (previousMonth === 0) {
      return { direction: lastMonth > 0 ? "up" : "stable", percentage: 0 };
    }

    const change = ((lastMonth - previousMonth) / previousMonth) * 100;
    return {
      direction: change > 0 ? "up" : change < 0 ? "down" : "stable",
      percentage: Math.abs(Math.round(change)),
    };
  })();

  const totalAttendance = attendanceData?.length || 0;
  const attendanceRate = totalEventsData && totalEventsData > 0
    ? Math.round((totalAttendance / totalEventsData) * 100)
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" />
          {t("attendance.statistics")}
        </CardTitle>
        <CardDescription>
          {t("memberStats.last6Months")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{totalAttendance}</p>
            <p className="text-xs text-muted-foreground">{t("memberStats.totalPresences")}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">{t("memberStats.attendanceRate")}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {monthlyStats[monthlyStats.length - 1]?.count || 0}
            </p>
            <p className="text-xs text-muted-foreground">{t("memberStats.thisMonth")}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-1">
              {trend.direction === "up" && (
                <TrendingUp className="h-5 w-5 text-success" />
              )}
              {trend.direction === "down" && (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              {trend.direction === "stable" && (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <span className={`text-lg font-bold ${
                trend.direction === "up" ? "text-success" : 
                trend.direction === "down" ? "text-destructive" : 
                "text-muted-foreground"
              }`}>
                {trend.percentage}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t("memberStats.trend")}</p>
          </div>
        </div>

        {/* Monthly Chart */}
        {monthlyStats.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("memberStats.monthlyEvolution")}
            </h4>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value, t("memberStats.presences")]}
                    labelFormatter={(label) => {
                      const stat = monthlyStats.find(s => s.month === label);
                      return stat?.fullMonth || label;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Event Type Distribution */}
        {eventTypeStats.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("memberStats.byEventType")}
            </h4>
            <div className="flex flex-wrap gap-2">
              {eventTypeStats.map((stat) => (
                <Badge 
                  key={stat.type} 
                  variant="secondary"
                  className="px-3 py-1"
                >
                  {stat.type}: <span className="font-bold ml-1">{stat.count}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* No data message */}
        {totalAttendance === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>{t("memberStats.noAttendanceRecords")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
