import { useState } from "react";
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
import { Clock, MapPin, Plus, Users } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import EventDialog from "@/components/EventDialog";

const events = [
  {
    id: 1,
    name: "Sèvis Dimanch",
    date: "2025-01-21",
    time: "10:00 AM",
    location: "Sanktiyè Prensipal",
    attendees: 200,
    status: "Konfime",
  },
  {
    id: 2,
    name: "Etid Biblik",
    date: "2025-01-23",
    time: "7:00 PM",
    location: "Sal Rankont",
    attendees: 45,
    status: "Konfime",
  },
  {
    id: 3,
    name: "Rankont Jèn",
    date: "2025-01-25",
    time: "6:00 PM",
    location: "Espas Jèn",
    attendees: 60,
    status: "Planifye",
  },
  {
    id: 4,
    name: "Sèvis Priyè",
    date: "2025-01-24",
    time: "6:00 AM",
    location: "Sanktiyè Prensipal",
    attendees: 35,
    status: "Konfime",
  },
  {
    id: 5,
    name: "Rankont Fanmi",
    date: "2025-01-28",
    time: "4:00 PM",
    location: "Sal Rekreyasyon",
    attendees: 80,
    status: "Planifye",
  },
];

const statusColors: Record<string, string> = {
  Konfime: "bg-success/10 text-success border-success/20",
  Planifye: "bg-info/10 text-info border-info/20",
  Kansele: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Events() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const eventsOnSelectedDate = selectedDate
    ? events.filter((event) => isSameDay(new Date(event.date), selectedDate))
    : [];

  const eventDates = events.map((event) => new Date(event.date));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Jesyon Evènman
            </h2>
            <p className="text-muted-foreground">
              Planifye ak jere evènman legliz ou
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Kreye Evènman
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Kalandriye</CardTitle>
              <CardDescription>Chwazi yon dat pou wè evènman yo</CardDescription>
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
                Evènman nan{" "}
                {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "..."}
              </CardTitle>
              <CardDescription>
                {eventsOnSelectedDate.length} evènman
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsOnSelectedDate.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Pa gen evènman nan dat sa a
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
                          className={statusColors[event.status]}
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {event.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {event.attendees} patisipan espere
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          Modifye
                        </Button>
                        <Button size="sm" className="flex-1">
                          Detay
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
            <CardTitle>Tout Evènman Pwochen</CardTitle>
            <CardDescription>Evènman ki ap vini yo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{event.name}</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {format(new Date(event.date), "PPP", { locale: fr })}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className={statusColors[event.status]}
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {event.attendees} patisipan
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </Layout>
  );
}
