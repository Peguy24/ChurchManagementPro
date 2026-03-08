import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCurrentUserTenantId } from "@/hooks/useCurrentTenant";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Maximize, Minimize, CheckCircle, XCircle, Scan, Church, Clock, AlertTriangle } from "lucide-react";
import { cn, getLocalToday } from "@/lib/utils";
import CameraScanner from "@/components/CameraScanner";
import { playSuccessSound, playErrorSound } from "@/lib/soundGenerator";

type FeedbackStatus = "idle" | "success" | "error" | "duplicate";

interface EventOption {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  end_time: string | null;
  end_date: string | null;
  status: string | null;
}

function isWithinEventWindow(event: EventOption): { allowed: boolean; reason: string } {
  const now = new Date();
  const today = getLocalToday();

  // Check date range
  const eventStartDate = event.event_date;
  const eventEndDate = event.end_date || event.event_date;

  if (today < eventStartDate || today > eventEndDate) {
    return { allowed: false, reason: "L'événement n'a pas lieu aujourd'hui." };
  }

  // If event has a start time, check 30min before
  if (event.event_time) {
    const [h, m] = event.event_time.split(":").map(Number);
    const eventStart = new Date(now);
    eventStart.setHours(h, m, 0, 0);
    const windowOpen = new Date(eventStart.getTime() - 30 * 60 * 1000);

    if (now < windowOpen) {
      const openTime = windowOpen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { allowed: false, reason: `Le scan ouvrira à ${openTime} (30 min avant le début).` };
    }
  }

  // If event has an end time, check if it's past
  if (event.end_time) {
    const [eh, em] = event.end_time.split(":").map(Number);
    const eventEnd = new Date(now);
    eventEnd.setHours(eh, em, 0, 0);

    if (now > eventEnd) {
      return { allowed: false, reason: "L'événement est terminé. Le scan n'est plus accepté." };
    }
  }

  return { allowed: true, reason: "" };
}

export default function AttendanceKiosk() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { settings: wl } = useWhiteLabel();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [memberName, setMemberName] = useState("");
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [scannerActive, setScannerActive] = useState(true);
  const debounceRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Event selection state
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [windowStatus, setWindowStatus] = useState<{ allowed: boolean; reason: string }>({ allowed: false, reason: "Sélectionnez un événement." });

  // Resolve tenant
  useEffect(() => {
    if (user?.id) {
      getCurrentUserTenantId(user.id).then(setTenantId);
    }
  }, [user?.id]);

  // Load today's events
  useEffect(() => {
    if (!tenantId) return;
    const today = getLocalToday();

    supabase
      .from("events")
      .select("id, name, event_date, event_time, end_time, end_date, status")
      .eq("tenant_id", tenantId)
      .lte("event_date", today)
      .in("status", ["planned", "confirmed"])
      .order("event_time", { ascending: true })
      .then(({ data }) => {
        // Filter events whose date range includes today
        const todayEvents = (data || []).filter(e => {
          const endDate = e.end_date || e.event_date;
          return e.event_date <= today && endDate >= today;
        });
        setEvents(todayEvents);
        if (todayEvents.length === 1) {
          setSelectedEventId(todayEvents[0].id);
        }
      });
  }, [tenantId]);

  // Check time window periodically
  useEffect(() => {
    const checkWindow = () => {
      if (!selectedEventId) {
        setWindowStatus({ allowed: false, reason: "Sélectionnez un événement." });
        return;
      }
      const event = events.find(e => e.id === selectedEventId);
      if (!event) {
        setWindowStatus({ allowed: false, reason: "Événement introuvable." });
        return;
      }
      setWindowStatus(isWithinEventWindow(event));
    };

    checkWindow();
    const interval = setInterval(checkWindow, 15000); // re-check every 15s
    return () => clearInterval(interval);
  }, [selectedEventId, events]);

  const resetFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFeedback("idle");
      setFeedbackMessage("");
      setMemberName("");
    }, 3000);
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const handleScan = useCallback(async (code: string) => {
    if (!code || code === debounceRef.current) return;
    debounceRef.current = code;
    setTimeout(() => { debounceRef.current = ""; }, 15000);

    // Re-validate time window at scan time
    if (!selectedEvent) {
      setFeedback("error");
      setFeedbackMessage("Aucun événement sélectionné.");
      playErrorSound(0.8);
      resetFeedback();
      return;
    }

    const check = isWithinEventWindow(selectedEvent);
    if (!check.allowed) {
      setFeedback("error");
      setFeedbackMessage(check.reason);
      playErrorSound(0.8);
      resetFeedback();
      return;
    }

    const match = code.match(/^MEMBER-(.+)$/);
    if (!match) {
      setFeedback("error");
      setFeedbackMessage(t("kiosk.invalidQR"));
      playErrorSound(0.8);
      resetFeedback();
      return;
    }

    const memberId = match[1];
    if (!tenantId) {
      setFeedback("error");
      setFeedbackMessage(t("kiosk.noTenant"));
      resetFeedback();
      return;
    }

    try {
      const { data: member } = await supabase
        .from("members")
        .select("first_name, last_name")
        .eq("id", memberId)
        .eq("tenant_id", tenantId)
        .single();

      if (!member) {
        setFeedback("error");
        setFeedbackMessage(t("kiosk.memberNotFound"));
        playErrorSound(0.8);
        resetFeedback();
        return;
      }

      const fullName = `${member.first_name} ${member.last_name}`;
      const today = getLocalToday();

      const { error } = await supabase.from("attendance_records").insert({
        member_id: memberId,
        event_type: selectedEvent.name,
        event_date: today,
        event_id: selectedEvent.id,
        scan_method: "qr_scan",
        marked_by: user?.id || null,
        tenant_id: tenantId,
      });

      if (error) {
        if (error.code === "23505") {
          setFeedback("duplicate");
          setMemberName(fullName);
          setFeedbackMessage(t("kiosk.alreadyCheckedIn"));
          playErrorSound(0.8);
        } else {
          throw error;
        }
      } else {
        setFeedback("success");
        setMemberName(fullName);
        setFeedbackMessage(t("kiosk.welcomeMessage"));
        setTotalCheckins(prev => prev + 1);
        playSuccessSound(0.8);
      }
    } catch (err) {
      console.error("Kiosk scan error:", err);
      setFeedback("error");
      setFeedbackMessage(t("kiosk.scanError"));
      playErrorSound(0.8);
    }

    resetFeedback();
  }, [user, t, resetFeedback, selectedEvent, tenantId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const bgColor = feedback === "success" ? "bg-green-50 dark:bg-green-950/30" :
                  feedback === "duplicate" ? "bg-yellow-50 dark:bg-yellow-950/30" :
                  feedback === "error" ? "bg-red-50 dark:bg-red-950/30" : "bg-background";

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-500", bgColor)}>
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {wl.logo_url ? (
            <img src={wl.logo_url} alt="" className="h-10 w-10 object-contain rounded" />
          ) : (
            <Church className="h-8 w-8 text-primary" />
          )}
          <div>
            <h2 className="font-bold text-lg">{wl.app_name}</h2>
            <p className="text-xs text-muted-foreground">{t("kiosk.title")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <div className="text-2xl font-bold text-primary">{totalCheckins}</div>
            <div className="text-[10px] text-muted-foreground">{t("kiosk.checkins")}</div>
          </div>
          <Button variant="outline" size="icon" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-6 mt-16 w-full max-w-md">
        {/* Event selector */}
        <div className="w-full">
          <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={events.length === 0 ? "Aucun événement aujourd'hui" : "Sélectionner l'événement"} />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} {event.event_time ? `(${event.event_time.substring(0, 5)})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time window status */}
        {!windowStatus.allowed && selectedEventId && (
          <Card className="w-full border-2 border-yellow-500">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Scan non disponible</p>
                <p className="text-sm text-muted-foreground">{windowStatus.reason}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback card */}
        {feedback !== "idle" && (
          <Card className={cn(
            "w-full border-2 transition-all animate-in fade-in zoom-in duration-300",
            feedback === "success" && "border-green-500",
            feedback === "duplicate" && "border-yellow-500",
            feedback === "error" && "border-destructive",
          )}>
            <CardContent className="flex flex-col items-center py-6">
              {feedback === "success" ? (
                <CheckCircle className="h-16 w-16 text-green-500 mb-3" />
              ) : feedback === "duplicate" ? (
                <CheckCircle className="h-16 w-16 text-yellow-500 mb-3" />
              ) : (
                <XCircle className="h-16 w-16 text-destructive mb-3" />
              )}
              {memberName && (
                <h3 className="text-2xl font-bold text-center mb-1">{memberName}</h3>
              )}
              <p className="text-lg text-center text-muted-foreground">
                {feedbackMessage}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scanner - only show when window is open */}
        {feedback === "idle" && windowStatus.allowed && (
          <div className="w-full">
            <div className="text-center mb-4">
              <Scan className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-xl font-semibold">{t("kiosk.scanPrompt")}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedEvent?.name} — {selectedEvent?.event_time?.substring(0, 5)}
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-primary/20">
              <CameraScanner
                onScan={handleScan}
                isActive={scannerActive}
                onActiveChange={setScannerActive}
              />
            </div>
          </div>
        )}

        {/* No events today */}
        {events.length === 0 && feedback === "idle" && (
          <Card className="w-full">
            <CardContent className="flex flex-col items-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-lg font-semibold">Aucun événement aujourd'hui</p>
              <p className="text-sm text-muted-foreground">Créez un événement pour activer le scan.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="absolute bottom-4 left-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          ← {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
