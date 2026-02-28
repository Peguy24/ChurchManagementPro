import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cake, Heart, Church, Calendar, Users, Download, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInYears, isSameMonth, addDays, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from "xlsx";

interface BirthdaysReportTabProps {
  selectedBranch: string;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  baptism_date: string | null;
  marriage_date: string | null;
  join_date: string | null;
  conversion_date: string | null;
  phone: string | null;
  email: string | null;
  branch_id: string | null;
  status: string | null;
}

interface UpcomingEvent {
  member: Member;
  eventType: "birthday" | "baptism" | "marriage" | "join" | "conversion";
  date: Date;
  years: number;
}

export default function BirthdaysReportTab({ selectedBranch }: BirthdaysReportTabProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [eventType, setEventType] = useState<string>("all");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-birthdays", selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, first_name, last_name, date_of_birth, baptism_date, marriage_date, join_date, conversion_date, phone, email, branch_id, status")
        .eq("status", "active");

      if (selectedBranch !== "all") {
        query = query.eq("branch_id", selectedBranch);
      }

      const { data, error } = await query.order("first_name");
      if (error) throw error;
      return data as Member[];
    },
  });

  const getUpcomingEvents = (daysAhead: number = 30): UpcomingEvent[] => {
    const today = new Date();
    const futureDate = addDays(today, daysAhead);
    const events: UpcomingEvent[] = [];

    members.forEach((member) => {
      const eventTypes: { type: UpcomingEvent["eventType"]; date: string | null }[] = [
        { type: "birthday", date: member.date_of_birth },
        { type: "baptism", date: member.baptism_date },
        { type: "marriage", date: member.marriage_date },
        { type: "join", date: member.join_date },
        { type: "conversion", date: member.conversion_date },
      ];

      eventTypes.forEach(({ type, date }) => {
        if (!date) return;

        const originalDate = parseISO(date);
        const thisYearDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());
        
        // If the date has passed this year, check next year
        let eventDate = thisYearDate;
        if (isBefore(thisYearDate, today)) {
          eventDate = new Date(today.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
        }

        if (isAfter(eventDate, today) && isBefore(eventDate, futureDate)) {
          events.push({
            member,
            eventType: type,
            date: eventDate,
            years: differenceInYears(eventDate, originalDate),
          });
        }
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getMonthEvents = (month: number): UpcomingEvent[] => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), month, 1);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);
    const events: UpcomingEvent[] = [];

    members.forEach((member) => {
      const eventTypes: { type: UpcomingEvent["eventType"]; date: string | null }[] = [
        { type: "birthday", date: member.date_of_birth },
        { type: "baptism", date: member.baptism_date },
        { type: "marriage", date: member.marriage_date },
        { type: "join", date: member.join_date },
        { type: "conversion", date: member.conversion_date },
      ];

      eventTypes.forEach(({ type, date }) => {
        if (!date) return;
        if (eventType !== "all" && type !== eventType) return;

        const originalDate = parseISO(date);
        const thisYearDate = new Date(today.getFullYear(), originalDate.getMonth(), originalDate.getDate());

        if (isSameMonth(thisYearDate, targetDate)) {
          events.push({
            member,
            eventType: type,
            date: thisYearDate,
            years: differenceInYears(thisYearDate, originalDate),
          });
        }
      });
    });

    return events.sort((a, b) => a.date.getDate() - b.date.getDate());
  };

  const upcomingEvents = getUpcomingEvents(30);
  const monthEvents = getMonthEvents(parseInt(selectedMonth));

  const getEventIcon = (type: UpcomingEvent["eventType"]) => {
    switch (type) {
      case "birthday": return <Cake className="h-4 w-4" />;
      case "baptism": return <Church className="h-4 w-4" />;
      case "marriage": return <Heart className="h-4 w-4" />;
      case "join": return <Users className="h-4 w-4" />;
      case "conversion": return <Gift className="h-4 w-4" />;
    }
  };

  const getEventLabel = (type: UpcomingEvent["eventType"]) => {
    switch (type) {
      case "birthday": return "Anniversaire";
      case "baptism": return "Baptême";
      case "marriage": return "Mariage";
      case "join": return "Adhésion";
      case "conversion": return "Conversion";
    }
  };

  const getEventBadgeVariant = (type: UpcomingEvent["eventType"]) => {
    switch (type) {
      case "birthday": return "default";
      case "baptism": return "secondary";
      case "marriage": return "outline";
      case "join": return "default";
      case "conversion": return "secondary";
    }
  };

  // Stats for current month
  const currentMonthEvents = getMonthEvents(new Date().getMonth());
  const birthdaysThisMonth = currentMonthEvents.filter(e => e.eventType === "birthday").length;
  const baptismAnniversaries = currentMonthEvents.filter(e => e.eventType === "baptism").length;
  const marriageAnniversaries = currentMonthEvents.filter(e => e.eventType === "marriage").length;

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const exportToExcel = () => {
    const data = monthEvents.map((event) => ({
      "Membre": `${event.member.first_name} ${event.member.last_name}`,
      "Type": getEventLabel(event.eventType),
      "Date": format(event.date, "dd MMMM", { locale: fr }),
      "Années": event.years,
      "Téléphone": event.member.phone || "-",
      "Email": event.member.email || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Anniversaires");
    XLSX.writeFile(wb, `anniversaires_${months[parseInt(selectedMonth)]}.xlsx`);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anniversaires ce mois</CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{birthdaysThisMonth}</div>
            <p className="text-xs text-muted-foreground">membres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anniv. Baptême</CardTitle>
            <Church className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{baptismAnniversaries}</div>
            <p className="text-xs text-muted-foreground">ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anniv. Mariage</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marriageAnniversaries}</div>
            <p className="text-xs text-muted-foreground">ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochains 30 jours</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">événements</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Prochains événements</TabsTrigger>
          <TabsTrigger value="monthly">Par mois</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Événements des 30 prochains jours</CardTitle>
              <CardDescription>Anniversaires et dates importantes à venir</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucun événement dans les 30 prochains jours</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Membre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Années</TableHead>
                      <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.map((event, index) => (
                      <TableRow key={`${event.member.id}-${event.eventType}-${index}`}>
                        <TableCell>
                          <div className="font-medium">
                            {format(event.date, "dd MMMM", { locale: fr })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(event.date, "EEEE", { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {event.member.first_name} {event.member.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(event.eventType)} className="flex items-center gap-1 w-fit">
                            {getEventIcon(event.eventType)}
                            {getEventLabel(event.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{event.years}</span> ans
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            {event.member.phone && <div>{event.member.phone}</div>}
                            {event.member.email && (
                              <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                                {event.member.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Événements par mois</CardTitle>
                  <CardDescription>Filtrez les anniversaires et dates importantes</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="birthday">Anniversaires</SelectItem>
                      <SelectItem value="baptism">Baptêmes</SelectItem>
                      <SelectItem value="marriage">Mariages</SelectItem>
                      <SelectItem value="join">Adhésions</SelectItem>
                      <SelectItem value="conversion">Conversions</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportToExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun événement en {months[parseInt(selectedMonth)]}
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jour</TableHead>
                      <TableHead>Membre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Années</TableHead>
                      <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthEvents.map((event, index) => (
                      <TableRow key={`${event.member.id}-${event.eventType}-${index}`}>
                        <TableCell>
                          <div className="font-medium text-lg">
                            {format(event.date, "dd")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {event.member.first_name} {event.member.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(event.eventType)} className="flex items-center gap-1 w-fit">
                            {getEventIcon(event.eventType)}
                            {getEventLabel(event.eventType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">{event.years}</span> ans
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="text-sm">
                            {event.member.phone && <div>{event.member.phone}</div>}
                            {event.member.email && (
                              <div className="text-muted-foreground text-xs truncate max-w-[150px]">
                                {event.member.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
