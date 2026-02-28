import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MapPin, Plus, Users, Loader2, Download, CalendarDays, Tag } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import EventDialog from "@/components/EventDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateAnnualCalendarPDF } from "@/lib/annualCalendarPDF";

const parseEventDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  branch_id: string | null;
  status: string;
  expected_attendees: number;
  event_category: string | null;
  created_at: string;
}

const categoryColorClasses: Record<string, string> = {
  general: "bg-muted text-muted-foreground",
  worship: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  fasting: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  conference: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  retreat: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  celebration: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  prayer: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  youth: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  community: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  holiday: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

const getStatusColors = () => ({
  confirmed: "bg-success/10 text-success border-success/20",
  planned: "bg-info/10 text-info border-info/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-muted text-muted-foreground border-muted",
});

export default function Events() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const statusColors = getStatusColors();
  const statusLabels: Record<string, string> = {
    confirmed: t("events.confirmed"),
    planned: t("events.planned"),
    cancelled: t("events.cancelled"),
    completed: t("events.completed"),
  };

  const categoryKeys = ["general", "worship", "fasting", "conference", "retreat", "celebration", "prayer", "youth", "community", "holiday"];

  const dateLocale = language === "fr" ? fr : language === "ht" ? fr : enUS;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  // Filter by year and category
  const filteredEvents = events.filter((event) => {
    const eventYear = event.event_date.split("-")[0];
    const yearMatch = selectedYear === "all" || eventYear === selectedYear;
    const catMatch = selectedCategory === "all" || (event.event_category || "general") === selectedCategory;
    return yearMatch && catMatch;
  });

  const eventsOnSelectedDate = selectedDate
    ? filteredEvents.filter((event) => isSameDay(parseEventDate(event.event_date), selectedDate))
    : [];

  const eventDates = filteredEvents.map((event) => parseEventDate(event.event_date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = filteredEvents.filter((event) => {
    const eventDate = parseEventDate(event.event_date);
    return eventDate >= today;
  });

  // Get available years from events
  const availableYears = [...new Set(events.map((e) => e.event_date.split("-")[0]))].sort().reverse();
  const currentYear = new Date().getFullYear().toString();
  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelectedEvent(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  const handleDownloadPDF = () => {
    const year = selectedYear === "all" ? new Date().getFullYear() : parseInt(selectedYear);
    const yearEvents = events.filter((e) => {
      const y = e.event_date.split("-")[0];
      return selectedYear === "all" || y === selectedYear;
    });
    generateAnnualCalendarPDF(yearEvents, year, "", language);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("events.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("events.subtitle")}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              {t("events.downloadCalendar")}
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("events.addEvent")}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("events.allEvents")}</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("events.allEvents")}</SelectItem>
                {categoryKeys.map((cat) => (
                  <SelectItem key={cat} value={cat}>{t(`events.${cat}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("events.calendar")}</CardTitle>
                  <CardDescription>{t("events.selectDate")}</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={dateLocale}
                    className="pointer-events-auto"
                    modifiers={{ hasEvent: eventDates }}
                    modifiersStyles={{
                      hasEvent: {
                        fontWeight: "bold",
                        textDecoration: "underline",
                        color: "hsl(var(--primary))",
                      },
                    }}
                  />
                </CardContent>
              </Card>

              {/* Events for Selected Date */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("events.eventsOn")}{" "}
                    {selectedDate ? format(selectedDate, "PPP", { locale: dateLocale }) : "..."}
                  </CardTitle>
                  <CardDescription>
                    {eventsOnSelectedDate.length} {t("events.eventsCount")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsOnSelectedDate.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("events.noEventsOnDate")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {eventsOnSelectedDate.map((event) => (
                        <div
                          key={event.id}
                          className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-lg">{event.name}</h3>
                              <Badge className={categoryColorClasses[event.event_category || "general"] || categoryColorClasses.general}>
                                {t(`events.${event.event_category || "general"}`)}
                              </Badge>
                            </div>
                            <Badge
                              variant="outline"
                              className={statusColors[event.status] || statusColors.planned}
                            >
                              {statusLabels[event.status] || event.status}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-sm text-muted-foreground">
                            {event.event_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {formatTime(event.event_time)}
                                {event.end_time && ` - ${formatTime(event.end_time)}`}
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </div>
                            )}
                            {event.expected_attendees > 0 && (
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {event.expected_attendees} {t("events.participantsExpected")}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEditEvent(event)}
                            >
                              {t("events.edit")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* All Upcoming / Filtered Events */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedYear !== "all" ? `${t("events.annualPlanning")} ${selectedYear}` : t("events.allUpcoming")}
                </CardTitle>
                <CardDescription>
                  {upcomingEvents.length} {t("events.eventsPlanned")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("events.noUpcoming")}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.map((event) => (
                      <Card
                        key={event.id}
                        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleEditEvent(event)}
                      >
                        <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{event.name}</CardTitle>
                            <CardDescription className="text-sm">
                                {format(parseEventDate(event.event_date), "PPP", { locale: dateLocale })}
                                {event.end_date && ` → ${format(parseEventDate(event.end_date), "PPP", { locale: dateLocale })}`}
                              </CardDescription>
                            </div>
                            <Badge
                              variant="outline"
                              className={statusColors[event.status] || statusColors.planned}
                            >
                              {statusLabels[event.status] || event.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Badge className={`text-xs ${categoryColorClasses[event.event_category || "general"] || categoryColorClasses.general}`}>
                            {t(`events.${event.event_category || "general"}`)}
                          </Badge>
                          {event.event_time && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {formatTime(event.event_time)}
                              {event.end_time && ` - ${formatTime(event.end_time)}`}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </div>
                          )}
                          {event.expected_attendees > 0 && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {event.expected_attendees} {t("events.participants")}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <EventDialog
          open={dialogOpen}
          onOpenChange={handleCloseDialog}
          event={selectedEvent}
          onSuccess={handleSuccess}
        />
      </div>
    </Layout>
  );
}
