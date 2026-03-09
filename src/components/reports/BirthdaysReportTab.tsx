import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cake, Heart, Church, Calendar, Users, Download, Gift, FileDown } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInYears, isSameMonth, addDays, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import * as XLSX from "xlsx";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    birthdaysThisMonth: "Birthdays This Month",
    members: "members",
    baptismAnniv: "Baptism Anniv.",
    thisMonth: "this month",
    marriageAnniv: "Marriage Anniv.",
    next30Days: "Next 30 Days",
    events: "events",
    upcomingEvents: "Upcoming events",
    byMonth: "By month",
    eventsNext30Days: "Events in the next 30 days",
    importantDatesUpcoming: "Upcoming birthdays and important dates",
    noEventsNext30: "No events in the next 30 days",
    date: "Date",
    member: "Member",
    type: "Type",
    years: "Years",
    contact: "Contact",
    eventsByMonth: "Events by month",
    filterBirthdays: "Filter birthdays and important dates",
    noEventsIn: "No events in",
    day: "Day",
    birthday: "Birthday",
    baptism: "Baptism",
    marriage: "Marriage",
    membership: "Membership",
    conversion: "Conversion",
    all: "All",
    birthdays: "Birthdays",
    baptisms: "Baptisms",
    marriages: "Marriages",
    memberships: "Memberships",
    conversions: "Conversions",
    loading: "Loading...",
    yrs: "years",
    january: "January", february: "February", march: "March", april: "April",
    may: "May", june: "June", july: "July", august: "August",
    september: "September", october: "October", november: "November", december: "December",
  },
  fr: {
    birthdaysThisMonth: "Anniversaires ce mois",
    members: "membres",
    baptismAnniv: "Anniv. Baptême",
    thisMonth: "ce mois",
    marriageAnniv: "Anniv. Mariage",
    next30Days: "Prochains 30 jours",
    events: "événements",
    upcomingEvents: "Prochains événements",
    byMonth: "Par mois",
    eventsNext30Days: "Événements des 30 prochains jours",
    importantDatesUpcoming: "Anniversaires et dates importantes à venir",
    noEventsNext30: "Aucun événement dans les 30 prochains jours",
    date: "Date",
    member: "Membre",
    type: "Type",
    years: "Années",
    contact: "Contact",
    eventsByMonth: "Événements par mois",
    filterBirthdays: "Filtrez les anniversaires et dates importantes",
    noEventsIn: "Aucun événement en",
    day: "Jour",
    birthday: "Anniversaire",
    baptism: "Baptême",
    marriage: "Mariage",
    membership: "Adhésion",
    conversion: "Conversion",
    all: "Tous",
    birthdays: "Anniversaires",
    baptisms: "Baptêmes",
    marriages: "Mariages",
    memberships: "Adhésions",
    conversions: "Conversions",
    loading: "Chargement...",
    yrs: "ans",
    january: "Janvier", february: "Février", march: "Mars", april: "Avril",
    may: "Mai", june: "Juin", july: "Juillet", august: "Août",
    september: "Septembre", october: "Octobre", november: "Novembre", december: "Décembre",
  },
  ht: {
    birthdaysThisMonth: "Anivèsè mwa sa a",
    members: "manm",
    baptismAnniv: "Anivèsè Batèm",
    thisMonth: "mwa sa a",
    marriageAnniv: "Anivèsè Maryaj",
    next30Days: "Pwochen 30 Jou",
    events: "evènman",
    upcomingEvents: "Pwochen evènman",
    byMonth: "Pa mwa",
    eventsNext30Days: "Evènman nan 30 pwochen jou yo",
    importantDatesUpcoming: "Anivèsè ak dat enpòtan ki ap vini",
    noEventsNext30: "Pa gen evènman nan 30 pwochen jou yo",
    date: "Dat",
    member: "Manm",
    type: "Tip",
    years: "Ane",
    contact: "Kontak",
    eventsByMonth: "Evènman pa mwa",
    filterBirthdays: "Filtre anivèsè ak dat enpòtan",
    noEventsIn: "Pa gen evènman nan",
    day: "Jou",
    birthday: "Anivèsè",
    baptism: "Batèm",
    marriage: "Maryaj",
    membership: "Manm",
    conversion: "Konvèsyon",
    all: "Tout",
    birthdays: "Anivèsè",
    baptisms: "Batèm",
    marriages: "Maryaj",
    memberships: "Manm",
    conversions: "Konvèsyon",
    loading: "Chajman...",
    yrs: "ane",
    january: "Janvye", february: "Fevriye", march: "Mas", april: "Avril",
    may: "Me", june: "Jen", july: "Jiyè", august: "Out",
    september: "Septanm", october: "Oktòb", november: "Novanm", december: "Desanm",
  },
};

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
  const { language } = useLanguage();
  const lt = localTranslations[language] || localTranslations.en;
  const dateLocale = language === "fr" || language === "ht" ? fr : enUS;

  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [eventType, setEventType] = useState<string>("all");

  const months = [
    lt.january, lt.february, lt.march, lt.april, lt.may, lt.june,
    lt.july, lt.august, lt.september, lt.october, lt.november, lt.december
  ];

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

  const getEventLabel = (type: UpcomingEvent["eventType"]) => {
    switch (type) {
      case "birthday": return lt.birthday;
      case "baptism": return lt.baptism;
      case "marriage": return lt.marriage;
      case "join": return lt.membership;
      case "conversion": return lt.conversion;
    }
  };

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
        let eventDate = thisYearDate;
        if (isBefore(thisYearDate, today)) {
          eventDate = new Date(today.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
        }
        if (isAfter(eventDate, today) && isBefore(eventDate, futureDate)) {
          events.push({ member, eventType: type, date: eventDate, years: differenceInYears(eventDate, originalDate) });
        }
      });
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const getMonthEvents = (month: number): UpcomingEvent[] => {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), month, 1);
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
          events.push({ member, eventType: type, date: thisYearDate, years: differenceInYears(thisYearDate, originalDate) });
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

  const getEventBadgeVariant = (type: UpcomingEvent["eventType"]) => {
    switch (type) {
      case "birthday": return "default";
      case "baptism": return "secondary";
      case "marriage": return "outline";
      case "join": return "default";
      case "conversion": return "secondary";
    }
  };

  const currentMonthEvents = getMonthEvents(new Date().getMonth());
  const birthdaysThisMonth = currentMonthEvents.filter(e => e.eventType === "birthday").length;
  const baptismAnniversaries = currentMonthEvents.filter(e => e.eventType === "baptism").length;
  const marriageAnniversaries = currentMonthEvents.filter(e => e.eventType === "marriage").length;

  const exportToExcel = () => {
    const data = monthEvents.map((event) => ({
      [lt.member]: `${event.member.first_name} ${event.member.last_name}`,
      [lt.type]: getEventLabel(event.eventType),
      [lt.date]: format(event.date, "dd MMMM", { locale: dateLocale }),
      [lt.years]: event.years,
      [lt.contact]: event.member.phone || event.member.email || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lt.birthdays);
    XLSX.writeFile(wb, `birthdays-${months[parseInt(selectedMonth)]}.xlsx`);
  };

  const exportToCSV = () => {
    exportToCsv(
      monthEvents.map((event) => ({
        membre: `${event.member.first_name} ${event.member.last_name}`,
        type: getEventLabel(event.eventType),
        date: format(event.date, "dd MMMM", { locale: dateLocale }),
        annees: event.years,
        telephone: event.member.phone || "-",
        email: event.member.email || "-",
      })),
      [
        { key: "membre", header: lt.member },
        { key: "type", header: lt.type },
        { key: "date", header: lt.date },
        { key: "annees", header: lt.years },
        { key: "telephone", header: lt.contact },
        { key: "email", header: "Email" },
      ],
      `birthdays-${months[parseInt(selectedMonth)]}`
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">{lt.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.birthdaysThisMonth}</CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{birthdaysThisMonth}</div>
            <p className="text-xs text-muted-foreground">{lt.members}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.baptismAnniv}</CardTitle>
            <Church className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{baptismAnniversaries}</div>
            <p className="text-xs text-muted-foreground">{lt.thisMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.marriageAnniv}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marriageAnniversaries}</div>
            <p className="text-xs text-muted-foreground">{lt.thisMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{lt.next30Days}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingEvents.length}</div>
            <p className="text-xs text-muted-foreground">{lt.events}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">{lt.upcomingEvents}</TabsTrigger>
          <TabsTrigger value="monthly">{lt.byMonth}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{lt.eventsNext30Days}</CardTitle>
              <CardDescription>{lt.importantDatesUpcoming}</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{lt.noEventsNext30}</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt.date}</TableHead>
                      <TableHead>{lt.member}</TableHead>
                      <TableHead>{lt.type}</TableHead>
                      <TableHead>{lt.years}</TableHead>
                      <TableHead className="hidden sm:table-cell">{lt.contact}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingEvents.map((event, index) => (
                      <TableRow key={`${event.member.id}-${event.eventType}-${index}`}>
                        <TableCell>
                          <div className="font-medium">
                            {format(event.date, "dd MMMM", { locale: dateLocale })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(event.date, "EEEE", { locale: dateLocale })}
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
                          <span className="font-semibold">{event.years}</span> {lt.yrs}
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
                  <CardTitle>{lt.eventsByMonth}</CardTitle>
                  <CardDescription>{lt.filterBirthdays}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{lt.all}</SelectItem>
                      <SelectItem value="birthday">{lt.birthdays}</SelectItem>
                      <SelectItem value="baptism">{lt.baptisms}</SelectItem>
                      <SelectItem value="marriage">{lt.marriages}</SelectItem>
                      <SelectItem value="join">{lt.memberships}</SelectItem>
                      <SelectItem value="conversion">{lt.conversions}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={exportToExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={exportToCSV}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {lt.noEventsIn} {months[parseInt(selectedMonth)]}
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lt.day}</TableHead>
                      <TableHead>{lt.member}</TableHead>
                      <TableHead>{lt.type}</TableHead>
                      <TableHead>{lt.years}</TableHead>
                      <TableHead className="hidden sm:table-cell">{lt.contact}</TableHead>
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
                          <span className="font-semibold">{event.years}</span> {lt.yrs}
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
