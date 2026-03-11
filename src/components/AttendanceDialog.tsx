import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalToday } from "@/lib/utils";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useCurrentTenant, getCurrentUserTenantId } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  qr_code: string | null;
  status: string;
}

interface EventOption {
  id: string;
  name: string;
  event_time: string | null;
  end_time: string | null;
  event_date: string;
}

export default function AttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: AttendanceDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const [eventType, setEventType] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [date, setDate] = useState(getLocalToday());
  const [checkedMembers, setCheckedMembers] = useState<string[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const qrReaderRef = useRef<HTMLDivElement>(null);

  // Load members and events from database
  useEffect(() => {
    if (open) {
      loadMembers();
      loadEvents();
    }
  }, [open]);

  // Filter members based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMembers(members);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredMembers(
        members.filter(
          (member) =>
            member.first_name.toLowerCase().includes(query) ||
            member.last_name.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, members]);

  // Cleanup QR scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, qr_code, status")
        .eq("status", "active")
        .order("first_name");

      if (error) throw error;
      setMembers(data || []);
      setFilteredMembers(data || []);
    } catch (error) {
      console.error("Error loading members:", error);
      toast({
        title: t("attendance.error"),
        description: t("attendance.errorLoadingMembers"),
        variant: "destructive",
      });
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_time, end_time, event_date")
        .eq("event_date", date)
        .in("status", ["planned", "confirmed"])
        .order("event_time", { ascending: true });

      if (error) throw error;
      
      setEvents(data || []);
      
      if (data && data.length > 0) {
        setSelectedEventId(data[0].id);
        setEventType(data[0].name);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  // Reload events when date changes
  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [date, open]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    const selectedEvent = events.find(e => e.id === eventId);
    if (selectedEvent) {
      setEventType(selectedEvent.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast({
        title: t("attendance.error"),
        description: t("attendance.selectAnEvent"),
        variant: "destructive",
      });
      return;
    }

    if (checkedMembers.length === 0) {
      toast({
        title: t("attendance.error"),
        description: t("attendance.selectAtLeastOneMember"),
        variant: "destructive",
      });
      return;
    }

    // Time window validation for selected event
    if (selectedEventId) {
      const selectedEvent = events.find(e => e.id === selectedEventId);
      if (selectedEvent) {
        const now = new Date();
        const today = getLocalToday();

        if (date === today && selectedEvent.event_time) {
          const [h, m] = selectedEvent.event_time.split(":").map(Number);
          const eventStart = new Date(now);
          eventStart.setHours(h, m, 0, 0);
          const windowOpen = new Date(eventStart.getTime() - 30 * 60 * 1000);

          if (now < windowOpen) {
            const openTime = windowOpen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            toast({
              title: t("attendance.tooEarly"),
              description: t("attendance.scanOpensAt").replace("{time}", openTime),
              variant: "destructive",
            });
            return;
          }
        }

        if (date === today && selectedEvent.end_time) {
          const [eh, em] = selectedEvent.end_time.split(":").map(Number);
          const eventEnd = new Date(now);
          eventEnd.setHours(eh, em, 0, 0);

          if (now > eventEnd) {
            toast({
              title: t("attendance.eventEndedTitle"),
              description: t("attendance.eventEndedDesc"),
              variant: "destructive",
            });
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveTenantId = tenantId || (user ? await getCurrentUserTenantId(user.id) : null);

      if (!effectiveTenantId) {
        throw new Error("Missing tenant id for attendance insert");
      }

      let existingQuery = supabase
        .from("attendance_records")
        .select("member_id")
        .eq("tenant_id", effectiveTenantId)
        .eq("event_date", date)
        .in("member_id", checkedMembers);

      if (selectedEventId) {
        existingQuery = existingQuery.eq("event_id", selectedEventId);
      } else {
        existingQuery = existingQuery.is("event_id", null);
      }

      const { data: existingRows, error: existingError } = await existingQuery;
      if (existingError) throw existingError;

      const existingMemberIds = new Set((existingRows || []).map((row) => row.member_id));
      const membersToInsert = checkedMembers.filter((memberId) => !existingMemberIds.has(memberId));

      if (membersToInsert.length === 0) {
        toast({
          title: t("attendance.information"),
          description: t("attendance.membersAlreadyPresent"),
        });
        return;
      }

      const attendanceRecords = membersToInsert.map((memberId) => ({
        event_type: eventType || "Culte",
        event_date: date,
        member_id: memberId,
        marked_by: user?.id,
        scan_method: "manual",
        event_id: selectedEventId,
        tenant_id: effectiveTenantId,
      }));

      const { error } = await supabase
        .from("attendance_records")
        .insert(attendanceRecords);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: t("attendance.information"),
            description: t("attendance.someAlreadyPresent"),
          });
          return;
        }
        throw error;
      }

      toast({
        title: t("attendance.scanSuccess"),
        description: t("attendance.attendanceRecordedCount")
          .replace("{count}", String(membersToInsert.length))
          .replace("{event}", eventType),
      });
      
      setCheckedMembers([]);
      setSearchQuery("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast({
        title: t("attendance.error"),
        description: t("attendance.errorSavingAttendance"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setCheckedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const startQRScanner = () => {
    setScannerActive(true);
    setTimeout(() => {
      if (qrReaderRef.current && !scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            handleQRScan(decodedText);
          },
          (error) => {
            // Silently handle scan errors
          }
        );
      }
    }, 100);
  };

  const stopQRScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerActive(false);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      const member = members.find((m) => m.qr_code === qrCode);
      
      if (!member) {
        toast({
          title: t("attendance.error"),
          description: t("attendance.qrNotRecognized"),
          variant: "destructive",
        });
        return;
      }

      if (checkedMembers.includes(member.id)) {
        toast({
          title: t("attendance.information"),
          description: t("attendance.alreadyMarkedInList").replace("{name}", `${member.first_name} ${member.last_name}`),
        });
        return;
      }

      setCheckedMembers((prev) => [...prev, member.id]);
      toast({
        title: t("attendance.success"),
        description: t("attendance.markedPresentToast").replace("{name}", `${member.first_name} ${member.last_name}`),
      });
    } catch (error) {
      console.error("Error processing QR scan:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("attendance.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("attendance.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">{t("attendance.date")}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event">{t("attendance.meetingType")}</Label>
              <Select value={selectedEventId || ""} onValueChange={handleEventChange}>
                <SelectTrigger>
                  <SelectValue placeholder={events.length === 0 ? t("attendance.noEventsForDate") : t("attendance.selectAnEvent")} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {events.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {t("attendance.noEventsScheduled")}
                    </SelectItem>
                  ) : (
                    events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} {event.event_time ? `(${event.event_time.substring(0, 5)})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("attendance.createEventHint")}
                </p>
              )}
            </div>
            
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                  <Search className="mr-2 h-4 w-4" />
                  {t("attendance.manual")}
                </TabsTrigger>
                <TabsTrigger value="qr" onClick={startQRScanner}>
                  <QrCode className="mr-2 h-4 w-4" />
                  {t("attendance.scanQRTab")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid gap-2">
                  <Label>{t("attendance.searchMember")}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("attendance.typeMemberName")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label>{t("attendance.attendanceList")}</Label>
                  <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-4">
                    {filteredMembers.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        {members.length === 0 ? t("attendance.noMembersInDb") : t("attendance.noResults")}
                      </p>
                    ) : (
                      filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center space-x-2 rounded-lg p-2 hover:bg-muted"
                        >
                          <Checkbox
                            id={`member-${member.id}`}
                            checked={checkedMembers.includes(member.id)}
                            onCheckedChange={() => toggleMember(member.id)}
                          />
                          <label
                            htmlFor={`member-${member.id}`}
                            className="flex-1 cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {member.first_name} {member.last_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("attendance.membersSelected").replace("{count}", String(checkedMembers.length))}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4">
                <div className="grid gap-2">
                  <Label>{t("attendance.scanMemberQR")}</Label>
                  <div className="rounded-lg border p-4">
                    {scannerActive ? (
                      <>
                        <div id="qr-reader" ref={qrReaderRef}></div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full"
                          onClick={stopQRScanner}
                        >
                          {t("attendance.stopScanner")}
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground">
                          {t("attendance.clickScanQRTab")}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("attendance.membersMarkedPresent").replace("{count}", String(checkedMembers.length))}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                stopQRScanner();
                onOpenChange(false);
              }}
            >
              {t("attendance.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("attendance.saving") : t("attendance.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
