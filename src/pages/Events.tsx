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
import { Clock, MapPin, Plus, Users, Loader2 } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import EventDialog from "@/components/EventDialog";

// Helper to parse date string without timezone issues
const parseEventDate = (dateStr: string): Date => {
  // Parse as local date to avoid timezone offset issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  location: string | null;
  branch_id: string | null;
  status: string;
  expected_attendees: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  confirmed: "bg-success/10 text-success border-success/20",
  planned: "bg-info/10 text-info border-info/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-muted text-muted-foreground border-muted",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmé",
  planned: "Planifié",
  cancelled: "Annulé",
  completed: "Terminé",
};

export default function Events() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  const eventsOnSelectedDate = selectedDate
    ? events.filter((event) => isSameDay(parseEventDate(event.event_date), selectedDate))
    : [];

  const eventDates = events.map((event) => parseEventDate(event.event_date));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingEvents = events.filter((event) => {
    const eventDate = parseEventDate(event.event_date);
    return eventDate >= today;
  });

  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedEvent(null);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.substring(0, 5); // Format HH:MM
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Gestion des Événements
            </h2>
            <p className="text-muted-foreground">
              Planifiez et gérez les événements de votre église
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer Événement
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle>Calendrier</CardTitle>
                  <CardDescription>Choisissez une date pour voir les événements</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={fr}
                    className="pointer-events-auto"
                    modifiers={{
                      hasEvent: eventDates,
                    }}
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
                    Événements du{" "}
                    {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "..."}
                  </CardTitle>
                  <CardDescription>
                    {eventsOnSelectedDate.length} événement(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsOnSelectedDate.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun événement à cette date
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {eventsOnSelectedDate.map((event) => (
                        <div
                          key={event.id}
                          className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg">{event.name}</h3>
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
                                {event.expected_attendees} participants attendus
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
                              Modifier
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* All Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Tous les Événements à Venir</CardTitle>
                <CardDescription>
                  {upcomingEvents.length} événement(s) programmé(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun événement à venir. Cliquez sur "Créer Événement" pour en ajouter un.
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
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{event.name}</CardTitle>
                              <CardDescription className="mt-1 text-sm">
                                {format(parseEventDate(event.event_date), "PPP", { locale: fr })}
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
                              {event.expected_attendees} participants
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