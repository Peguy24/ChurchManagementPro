import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Award,
  Download,
  Loader2
} from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { generateMemberHistoryPDF, downloadMemberHistoryPDF, MemberHistoryData } from "@/lib/memberHistoryPDF";
import { getArrivalStatus, formatScanTime } from "@/lib/attendanceStatus";

const timelineTranslations = {
  fr: {
    completeHistory: "Historique Complet",
    allActivities: "Toutes les activités du membre",
    presences: "Présences",
    donations: "Cotisations",
    generating: "Génération...",
    exportPdf: "Export PDF",
    noActivity: "Aucune activité enregistrée",
    method: "Méthode",
    manual: "Manuel",
    joined: "Rejoint",
    ministry: "Ministère",
    role: "Rôle",
    member: "Membre",
    becameMember: "Devenu membre",
    churchRegistration: "Inscription à l'église",
    baptism: "Baptême",
    baptismCeremony: "Cérémonie de baptême",
    conversion: "Conversion",
    decisionForChrist: "Décision pour Christ",
    dataNotAvailable: "Données du membre non disponibles",
    pdfSuccess: "PDF généré avec succès",
    pdfError: "Erreur lors de la génération du PDF",
  },
  en: {
    completeHistory: "Complete History",
    allActivities: "All member activities",
    presences: "Attendance",
    donations: "Donations",
    generating: "Generating...",
    exportPdf: "Export PDF",
    noActivity: "No activity recorded",
    method: "Method",
    manual: "Manual",
    joined: "Joined",
    ministry: "Ministry",
    role: "Role",
    member: "Member",
    becameMember: "Became a member",
    churchRegistration: "Church registration",
    baptism: "Baptism",
    baptismCeremony: "Baptism ceremony",
    conversion: "Conversion",
    decisionForChrist: "Decision for Christ",
    dataNotAvailable: "Member data not available",
    pdfSuccess: "PDF generated successfully",
    pdfError: "Error generating PDF",
  },
  ht: {
    completeHistory: "Istwa Konplè",
    allActivities: "Tout aktivite manm nan",
    presences: "Prezans",
    donations: "Kotizasyon",
    generating: "Ap jenere...",
    exportPdf: "Ekspòte PDF",
    noActivity: "Pa gen aktivite anrejistre",
    method: "Metòd",
    manual: "Manyèl",
    joined: "Rejwenn",
    ministry: "Ministè",
    role: "Wòl",
    member: "Manm",
    becameMember: "Vin manm",
    churchRegistration: "Enskripsyon nan legliz",
    baptism: "Batèm",
    baptismCeremony: "Seremoni batèm",
    conversion: "Konvèsyon",
    decisionForChrist: "Desizyon pou Kris",
    dataNotAvailable: "Done manm nan pa disponib",
    pdfSuccess: "PDF jenere avèk siksè",
    pdfError: "Erè pandan jenerasyon PDF",
  },
};

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
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { formatAmount } = useCurrency();
  const { language } = useLanguage();
  const tl = timelineTranslations[language] || timelineTranslations.fr;
  const dateLocale = language === "en" ? enUS : fr;
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

  // Fetch arrival records (with event time for status calculation)
  const { data: arrivalRecords = [] } = useQuery({
    queryKey: ["member-arrivals-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          id, event_date, event_type, marked_at,
          event:events!attendance_records_event_id_fkey(name, event_time)
        `)
        .eq("member_id", memberId)
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        event_name: r.event?.name || r.event_type,
        event_date: r.event_date,
        event_time: r.event?.event_time || null,
        scan_time: formatScanTime(r.marked_at),
        arrival_status: getArrivalStatus(r.marked_at, r.event?.event_time),
      }));
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

  // Fetch member info for milestones and PDF export
  const { data: member } = useQuery({
    queryKey: ["member-info-timeline", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("first_name, last_name, email, phone, address, photo_url, status, role, join_date, baptism_date, conversion_date, marriage_date")
        .eq("id", memberId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId,
  });

  // Export to PDF function
  const handleExportPDF = async () => {
    if (!member) {
      toast.error(tl.dataNotAvailable);
      return;
    }

    setGeneratingPDF(true);
    try {
      const historyData: MemberHistoryData = {
        member: {
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          phone: member.phone,
          address: member.address,
          photo_url: member.photo_url,
          status: member.status,
          role: member.role,
          join_date: member.join_date,
          baptism_date: member.baptism_date,
          conversion_date: member.conversion_date,
        },
        attendance: attendanceRecords.map((a) => ({
          event_type: a.event_type,
          event_date: a.event_date,
          scan_method: a.scan_method,
        })),
        arrivals: arrivalRecords,
        donations: donations.map((d) => ({
          amount: Number(d.amount),
          donation_type: d.donation_type,
          donation_date: d.donation_date,
          payment_method: d.payment_method,
        })),
        ministries: ministryMemberships.map((m: any) => ({
          ministry_name: m.ministry?.name || "Ministère",
          role: m.role,
          joined_date: m.joined_date,
        })),
        documents: documents.map((d) => ({
          document_name: d.document_name,
          document_type: d.document_type,
          document_date: d.document_date,
        })),
      };

      const blob = await generateMemberHistoryPDF(historyData, formatAmount, language);
      downloadMemberHistoryPDF(blob, `${member.first_name}_${member.last_name}`);
      toast.success(tl.pdfSuccess);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(tl.pdfError);
    } finally {
      setGeneratingPDF(false);
    }
  };

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique Complet
            </CardTitle>
            <CardDescription>
              Toutes les activités du membre
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalAttendance}</p>
                <p className="text-muted-foreground">Présences</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatAmount(totalDonations)}
                </p>
                <p className="text-muted-foreground">Cotisations</p>
              </div>
            </div>
            <Button 
              onClick={handleExportPDF} 
              disabled={generatingPDF || !member}
              size="sm"
              className="gap-2"
            >
              {generatingPDF ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
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
                                  {formatAmount(event.amount)}
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
