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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const filteredEvents = events.filter((event) => {
    if (!dateFrom && !dateTo) return true;
    const eventDate = new Date(event.date);
    if (dateFrom && dateTo) {
      return eventDate >= dateFrom && eventDate <= dateTo;
    }
    if (dateFrom) {
      return eventDate >= dateFrom;
    }
    if (dateTo) {
      return eventDate <= dateTo;
    }
    return true;
  });

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

        {/* Date Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtre pa Dat</CardTitle>
            <CardDescription>Chwazi yon peryòd pou wè evènman yo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Dat Kòmansman</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP", { locale: fr }) : <span>Chwazi dat</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Dat Fen</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP", { locale: fr }) : <span>Chwazi dat</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                  className="mt-auto"
                >
                  Efase Filt
                </Button>
              )}

              <div className="ml-auto text-sm text-muted-foreground">
                {filteredEvents.length} evènman jwenn
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lis Evènman</CardTitle>
            <CardDescription>Tout evènman planifye</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Non</TableHead>
                  <TableHead>Dat</TableHead>
                  <TableHead>Lè</TableHead>
                  <TableHead>Kote</TableHead>
                  <TableHead>Patisipan</TableHead>
                  <TableHead>Estati</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Pa gen evènman nan peryòd sa a
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(event.date), "PPP", { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {event.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {event.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {event.attendees}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[event.status]}>
                          {event.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </Layout>
  );
}
