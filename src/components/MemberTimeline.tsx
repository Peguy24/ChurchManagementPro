import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  Briefcase, 
  FileText,
  Church,
  Heart,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MemberTimelineProps {
  memberId: string;
}

interface TimelineEvent {
  id: string;
  type: "attendance" | "donation" | "ministry" | "document" | "milestone";
  title: string;
  description?: string;
  date: string;
  icon: any;
  color: string;
  amount?: number;
}

export default function MemberTimeline({ memberId }: MemberTimelineProps) {
  // Fetch attendance records
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["member-attendance-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, event_type, event_date, scan_method")
        .eq("member_id", memberId)
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch donations
  const { data: donations = [] } = useQuery({
    queryKey: ["member-donations-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donation_type, donation_date, payment_method")
        .eq("member_id", memberId)
        .order("donation_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch ministry memberships
  const { data: ministryMemberships = [] } = useQuery({
    queryKey: ["member-ministries-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministry_members")
        .select(`
          id,
          role,
          joined_date,
          ministry:ministries(name)
        `)
        .eq("member_id", memberId);
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["member-documents-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_documents")
        .select("id, document_type, document_name, document_date")
        .eq("member_id", memberId)
        .order("document_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Fetch member info for milestones
  const { data: member } = useQuery({
    queryKey: ["member-info-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("join_date, baptism_date, conversion_date, marriage_date")
        .eq("id", memberId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Build timeline events
  const timelineEvents: TimelineEvent[] = [];

  // Add attendance events
  attendanceRecords.forEach((record) => {
    timelineEvents.push({
      id: `attendance-${record.id}`,
      type: "attendance",
      title: record.event_type,
      description: `Méthode: ${record.scan_method || "Manuel"}`,
      date: record.event_date,
      icon: UserCheck,
      color: "text-green-600 bg-green-100",
    });
  });

  // Add donation events
  donations.forEach((donation) => {
    timelineEvents.push({
      id: `donation-${donation.id}`,
      type: "donation",
      title: donation.donation_type,
      description: `${donation.payment_method}`,
      date: donation.donation_date,
      icon: DollarSign,
      color: "text-blue-600 bg-blue-100",
      amount: Number(donation.amount),
    });
  });

  // Add ministry events
  ministryMemberships.forEach((mm: any) => {
    if (mm.joined_date) {
      timelineEvents.push({
        id: `ministry-${mm.id}`,
        type: "ministry",
        title: `Rejoint ${mm.ministry?.name || "Ministère"}`,
        description: `Rôle: ${mm.role || "Membre"}`,
        date: mm.joined_date,
        icon: Briefcase,
        color: "text-purple-600 bg-purple-100",
      });
    }
  });

  // Add document events
  documents.forEach((doc) => {
    timelineEvents.push({
      id: `document-${doc.id}`,
      type: "document",
      title: doc.document_name,
      description: doc.document_type,
      date: doc.document_date,
      icon: FileText,
      color: "text-orange-600 bg-orange-100",
    });
  });

  // Add milestones
  if (member?.join_date) {
    timelineEvents.push({
      id: "milestone-join",
      type: "milestone",
      title: "Devenu membre",
      description: "Inscription à l'église",
      date: member.join_date,
      icon: Church,
      color: "text-indigo-600 bg-indigo-100",
    });
  }

  if (member?.baptism_date) {
    timelineEvents.push({
      id: "milestone-baptism",
      type: "milestone",
      title: "Baptême",
      description: "Cérémonie de baptême",
      date: member.baptism_date,
      icon: Heart,
      color: "text-pink-600 bg-pink-100",
    });
  }

  if (member?.conversion_date) {
    timelineEvents.push({
      id: "milestone-conversion",
      type: "milestone",
      title: "Conversion",
      description: "Décision pour Christ",
      date: member.conversion_date,
      icon: Award,
      color: "text-amber-600 bg-amber-100",
    });
  }

  // Sort by date (most recent first)
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by month/year
  const groupedEvents: Record<string, TimelineEvent[]> = {};
  timelineEvents.forEach((event) => {
    const monthYear = format(new Date(event.date), "MMMM yyyy", { locale: fr });
    if (!groupedEvents[monthYear]) {
      groupedEvents[monthYear] = [];
    }
    groupedEvents[monthYear].push(event);
  });

  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalAttendance = attendanceRecords.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique Complet
            </CardTitle>
            <CardDescription>
              Toutes les activités du membre
            </CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{totalAttendance}</p>
              <p className="text-muted-foreground">Présences</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {totalDonations.toLocaleString("fr-FR")} €
              </p>
              <p className="text-muted-foreground">Cotisations</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {timelineEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune activité enregistrée</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedEvents).map(([monthYear, events]) => (
                <div key={monthYear}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                    {monthYear.charAt(0).toUpperCase() + monthYear.slice(1)}
                  </h4>
                  <div className="space-y-3">
                    {events.map((event) => {
                      const Icon = event.icon;
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className={`p-2 rounded-full ${event.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium truncate">{event.title}</p>
                              {event.amount && (
                                <Badge variant="secondary" className="shrink-0">
                                  {event.amount.toLocaleString("fr-FR")} €
                                </Badge>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.date), "dd MMMM yyyy", { locale: fr })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
