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
import { Calendar, Clock, MapPin, Plus, Users } from "lucide-react";

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
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Kreye Evènman
          </Button>
        </div>

        {/* Calendar View Header */}
        <Card>
          <CardHeader>
            <CardTitle>Kalandriye Evènman</CardTitle>
            <CardDescription>Janvye 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-sm">Konfime (3)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-info" />
                  <span className="text-sm">Planifye (2)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Jodiya
                </Button>
                <Button variant="outline" size="sm">
                  Semèn
                </Button>
                <Button variant="outline" size="sm">
                  Mwa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.date}
                      </div>
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
              <CardContent className="space-y-3">
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
                  {event.attendees} patisipan espere
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Modifye
                  </Button>
                  <Button size="sm" className="flex-1">
                    Detay
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
