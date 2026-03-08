import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isSameMonth, isToday } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { cn } from "@/lib/utils";
import EventDialog from "@/components/EventDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const categoryColors: Record<string, string> = {
  general: "bg-muted border-muted-foreground/20",
  worship: "bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300",
  fasting: "bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300",
  conference: "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300",
  retreat: "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300",
  celebration: "bg-red-500/10 border-red-500 text-red-700 dark:text-red-300",
  prayer: "bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-300",
  youth: "bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300",
  community: "bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300",
  holiday: "bg-pink-500/10 border-pink-500 text-pink-700 dark:text-pink-300",
};

const categoryDotColors: Record<string, string> = {
  general: "bg-muted-foreground",
  worship: "bg-blue-500",
  fasting: "bg-purple-500",
  conference: "bg-yellow-500",
  retreat: "bg-emerald-500",
  celebration: "bg-red-500",
  prayer: "bg-indigo-500",
  youth: "bg-orange-500",
  community: "bg-teal-500",
  holiday: "bg-pink-500",
};

export default function EventCalendar() {
  const { t, language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);

  const dateLocale = language === "fr" ? fr : enUS;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events = [], refetch } = useQuery({
    queryKey: ["calendar-events", tenantId, format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, end_date, event_time, end_time, location, event_category, expected_attendees, status")
        .eq("tenant_id", tenantId)
        .gte("event_date", format(monthStart, "yyyy-MM-dd"))
        .lte("event_date", format(monthEnd, "yyyy-MM-dd"))
        .order("event_date");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);
  const startDay = getDay(monthStart); // 0=Sun

  const eventsForDate = (date: Date) =>
    events.filter(e => {
      const [y, m, d] = e.event_date.split("-").map(Number);
      return isSameDay(new Date(y, m - 1, d), date);
    });

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("eventCalendar.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("eventCalendar.subtitle")}</p>
          </div>
          <Button onClick={() => setShowEventDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("events.addEvent")}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {language === "fr" ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][i] :
                   language === "ht" ? ["Dim", "Len", "Mad", "Mèk", "Jed", "Van", "Sam"][i] : d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Empty cells before month start */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-background min-h-[80px] sm:min-h-[100px] p-1" />
              ))}

              {days.map((day) => {
                const dayEvents = eventsForDate(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "bg-background min-h-[80px] sm:min-h-[100px] p-1 cursor-pointer transition-colors hover:bg-accent/50",
                      isSelected && "ring-2 ring-primary ring-inset",
                      isToday(day) && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[10px] sm:text-xs px-1 py-0.5 rounded border-l-2 truncate",
                            categoryColors[event.event_category || "general"] || categoryColors.general
                          )}
                        >
                          {event.name}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 2} {t("eventCalendar.more")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
              {Object.entries(categoryDotColors).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
                  <span className="text-xs text-muted-foreground capitalize">{t(`events.category.${key}`)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected date events panel */}
        <Dialog open={!!selectedDate && selectedEvents.length > 0} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <Card key={event.id} className={cn("border-l-4", categoryColors[event.event_category || "general"])}>
                    <CardContent className="p-3">
                      <h4 className="font-semibold text-sm">{event.name}</h4>
                      <div className="mt-2 space-y-1">
                        {event.event_time && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {event.event_time}{event.end_time ? ` — ${event.end_time}` : ""}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                        {event.expected_attendees > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {event.expected_attendees} {t("events.expectedAttendees")}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        {t(`events.category.${event.event_category || "general"}`)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {showEventDialog && (
          <EventDialog
            open={showEventDialog}
            onOpenChange={setShowEventDialog}
            onSuccess={() => {
              setShowEventDialog(false);
              refetch();
            }}
          />
        )}
      </div>
    </Layout>
  );
}
