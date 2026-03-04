import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, User, Mail } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

interface AttendanceAlert {
  member_id: string;
  member_name: string;
  current_rate: number;
  previous_rate: number;
  decline_percentage: number;
  last_attendance: string | null;
  total_absences: number;
}

export default function AttendanceAlerts() {
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    loadAttendanceAlerts();
  }, []);

  const loadAttendanceAlerts = async () => {
    try {
      setLoading(true);

      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: attendanceData, error } = await supabase
        .from("attendance_records")
        .select("member_id, event_date, members(first_name, last_name)")
        .gte("event_date", twoMonthsAgo.toISOString().split("T")[0]);

      if (error) throw error;

      const memberStats = new Map<string, {
        name: string;
        currentMonth: number;
        previousMonth: number;
        lastAttendance: string | null;
      }>();

      attendanceData?.forEach((record: any) => {
        const memberId = record.member_id;
        const eventDate = new Date(record.event_date);
        const memberName = `${record.members.first_name} ${record.members.last_name}`;

        if (!memberStats.has(memberId)) {
          memberStats.set(memberId, {
            name: memberName,
            currentMonth: 0,
            previousMonth: 0,
            lastAttendance: null,
          });
        }

        const stats = memberStats.get(memberId)!;

        if (eventDate >= oneMonthAgo) {
          stats.currentMonth++;
        } else {
          stats.previousMonth++;
        }

        if (!stats.lastAttendance || eventDate > new Date(stats.lastAttendance)) {
          stats.lastAttendance = record.event_date;
        }
      });

      const alertsList: AttendanceAlert[] = [];

      memberStats.forEach((stats, memberId) => {
        if (stats.previousMonth > 0) {
          const currentRate = stats.currentMonth;
          const previousRate = stats.previousMonth;
          const decline = ((previousRate - currentRate) / previousRate) * 100;

          if (decline > 30 || (currentRate === 0 && previousRate > 0)) {
            const daysSinceLastAttendance = stats.lastAttendance
              ? Math.floor((Date.now() - new Date(stats.lastAttendance).getTime()) / (1000 * 60 * 60 * 24))
              : null;

            alertsList.push({
              member_id: memberId,
              member_name: stats.name,
              current_rate: currentRate,
              previous_rate: previousRate,
              decline_percentage: decline,
              last_attendance: stats.lastAttendance,
              total_absences: daysSinceLastAttendance || 0,
            });
          }
        }
      });

      alertsList.sort((a, b) => b.decline_percentage - a.decline_percentage);
      setAlerts(alertsList);
    } catch (error) {
      console.error("Error loading attendance alerts:", error);
      toast.error(t("attendanceAlerts.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const viewMemberStats = (memberId: string) => {
    navigate(`/attendance/stats?memberId=${memberId}`);
  };

  const sendAlertEmail = async (alert: AttendanceAlert) => {
    try {
      setSendingEmail(alert.member_id);

      const { error } = await supabase.functions.invoke('send-absence-alert', {
        body: {
          member_id: alert.member_id,
          member_name: alert.member_name,
          decline_percentage: alert.decline_percentage,
          last_attendance: alert.last_attendance,
        },
      });

      if (error) throw error;

      toast.success(t("attendanceAlerts.emailSent").replace("{name}", alert.member_name));
    } catch (error: any) {
      console.error("Error sending alert email:", error);
      toast.error(t("attendanceAlerts.emailError") + ": " + error.message);
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t("common.loading")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t("attendanceAlerts.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("attendanceAlerts.subtitle")}
            </p>
          </div>
          <Button onClick={loadAttendanceAlerts} variant="outline">
            {t("attendanceAlerts.refresh")}
          </Button>
        </div>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t("attendanceAlerts.noAlerts")}</p>
              <p className="text-muted-foreground text-sm">
                {t("attendanceAlerts.allMembersGood")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => {
              const daysSinceLastAttendance = alert.last_attendance
                ? Math.floor((Date.now() - new Date(alert.last_attendance).getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Card key={alert.member_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{alert.member_name}</CardTitle>
                          <CardDescription>
                            {daysSinceLastAttendance !== null
                              ? t("attendanceAlerts.lastAttendance").replace("{days}", String(daysSinceLastAttendance))
                              : t("attendanceAlerts.noRecentAttendance")}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={alert.decline_percentage > 50 ? "destructive" : "secondary"}>
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {alert.decline_percentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("attendanceAlerts.previousMonth")}</p>
                        <p className="text-2xl font-bold">{alert.previous_rate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("attendanceAlerts.currentMonth")}</p>
                        <p className="text-2xl font-bold">{alert.current_rate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t("attendanceAlerts.decline")}</p>
                        <p className="text-2xl font-bold text-destructive">
                          -{alert.decline_percentage.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => viewMemberStats(alert.member_id)} className="flex-1">
                        {t("attendanceAlerts.viewStats")}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => sendAlertEmail(alert)}
                        disabled={sendingEmail === alert.member_id}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {sendingEmail === alert.member_id ? t("attendanceAlerts.sending") : t("attendanceAlerts.sendEmail")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
