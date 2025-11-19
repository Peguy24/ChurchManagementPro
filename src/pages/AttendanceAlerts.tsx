import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, User } from "lucide-react";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  useEffect(() => {
    loadAttendanceAlerts();
  }, []);

  const loadAttendanceAlerts = async () => {
    try {
      setLoading(true);

      // Get attendance data for the last 2 months
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data: attendanceData, error } = await supabase
        .from("attendance_records")
        .select("member_id, event_date, members(first_name, last_name)")
        .gte("event_date", twoMonthsAgo.toISOString().split("T")[0]);

      if (error) throw error;

      // Calculate attendance rates for each member
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

      // Identify members with declining attendance
      const alertsList: AttendanceAlert[] = [];

      memberStats.forEach((stats, memberId) => {
        // Only alert if member had attendance in previous month
        if (stats.previousMonth > 0) {
          const currentRate = stats.currentMonth;
          const previousRate = stats.previousMonth;
          const decline = ((previousRate - currentRate) / previousRate) * 100;

          // Alert if decline is more than 30% or no attendance in current month
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

      // Sort by decline percentage
      alertsList.sort((a, b) => b.decline_percentage - a.decline_percentage);

      setAlerts(alertsList);
    } catch (error) {
      console.error("Error loading attendance alerts:", error);
      toast.error("Erreur lors du chargement des alertes");
    } finally {
      setLoading(false);
    }
  };

  const viewMemberStats = (memberId: string) => {
    navigate(`/attendance/stats?memberId=${memberId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Chargement des alertes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alertes de Présence</h1>
          <p className="text-muted-foreground mt-2">
            Membres avec un taux de présence en baisse
          </p>
        </div>
        <Button onClick={loadAttendanceAlerts} variant="outline">
          Actualiser
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Aucune alerte</p>
            <p className="text-muted-foreground text-sm">
              Tous les membres maintiennent un bon taux de présence
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
                            ? `Dernière présence: il y a ${daysSinceLastAttendance} jours`
                            : "Aucune présence récente"}
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
                      <p className="text-sm text-muted-foreground">Mois précédent</p>
                      <p className="text-2xl font-bold">{alert.previous_rate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mois actuel</p>
                      <p className="text-2xl font-bold">{alert.current_rate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Baisse</p>
                      <p className="text-2xl font-bold text-destructive">
                        -{alert.decline_percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => viewMemberStats(alert.member_id)} className="flex-1">
                      Voir les statistiques
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Contacter le membre
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
