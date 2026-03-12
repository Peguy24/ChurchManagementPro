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
import { Badge } from "@/components/ui/badge";
import { getArrivalStatus, formatScanTime, getStatusTranslationKey, getStatusBadgeVariant } from "@/lib/attendanceStatus";
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

function isWithinEventWindow(event: EventOption): { allowed: boolean; reasonKey: string; reasonParams?: Record<string, string> } {
  const now = new Date();
  const today = getLocalToday();

  const eventStartDate = event.event_date;
  const eventEndDate = event.end_date || event.event_date;

  if (today < eventStartDate || today > eventEndDate) {
    return { allowed: false, reasonKey: "kiosk.eventNotToday" };
  }

  if (event.event_time) {
    const [h, m] = event.event_time.split(":").map(Number);
    const eventStart = new Date(now);
    eventStart.setHours(h, m, 0, 0);
    const windowOpen = new Date(eventStart.getTime() - 30 * 60 * 1000);

    if (now < windowOpen) {
      const openTime = windowOpen.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return { allowed: false, reasonKey: "kiosk.scanOpensAt", reasonParams: { time: openTime } };
    }
  }

  if (event.end_time) {
    const [eh, em] = event.end_time.split(":").map(Number);
    const eventEnd = new Date(now);
    eventEnd.setHours(eh, em, 0, 0);

    if (now > eventEnd) {
      return { allowed: false, reasonKey: "kiosk.eventEnded" };
    }
  }

  return { allowed: true, reasonKey: "" };
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
  const [windowStatus, setWindowStatus] = useState<{ allowed: boolean; reasonKey: string; reasonParams?: Record<string, string> }>({ allowed: false, reasonKey: "kiosk.selectEvent" });

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
        setWindowStatus({ allowed: false, reasonKey: "kiosk.selectEvent" });
        return;
      }
      const event = events.find(e => e.id === selectedEventId);
      if (!event) {
        setWindowStatus({ allowed: false, reasonKey: "kiosk.eventNotFound" });
        return;
      }
      setWindowStatus(isWithinEventWindow(event));
    };

    checkWindow();
    const interval = setInterval(checkWindow, 15000);
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
      setFeedbackMessage(t("kiosk.noEventSelected"));
      playErrorSound(0.8);
      resetFeedback();
      return;
    }

    const check = isWithinEventWindow(selectedEvent);
    if (!check.allowed) {
      const reason = check.reasonParams
        ? t(check.reasonKey).replace(/\{(\w+)\}/g, (_, k) => check.reasonParams?.[k] || "")
        : t(check.reasonKey);
      setFeedback("error");
      setFeedbackMessage(reason);
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

      const scanTimestamp = new Date().toISOString();
      const { error } = await supabase.from("attendance_records").insert({
        member_id: memberId,
        event_type: selectedEvent.name,
        event_date: today,
        event_id: selectedEvent.id,
        scan_method: "qr_scan",
        marked_by: user?.id || null,
        marked_at: scanTimestamp,
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
    <div className={cn("min-h-[100dvh] flex flex-col transition-colors duration-500", bgColor)}>
      {/* Header - compact on mobile */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {wl.logo_url ? (
            <img src={wl.logo_url} alt="" className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded shrink-0" />
          ) : (
            <Church className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-sm sm:text-lg truncate">{wl.app_name}</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t("kiosk.title")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="text-right mr-1 sm:mr-2">
            <div className="text-lg sm:text-2xl font-bold text-primary leading-tight">{totalCheckins}</div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground">{t("kiosk.checkins")}</div>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          </Button>
        </div>
      </div>

      {/* Main content - fills remaining space */}
      <div className="flex-1 flex flex-col items-center px-3 py-3 sm:px-6 sm:py-4 overflow-y-auto">
        <div className="w-full max-w-lg flex flex-col gap-3 sm:gap-4 flex-1">
          {/* Event selector */}
          <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full h-10 sm:h-11 text-sm sm:text-base">
              <SelectValue placeholder={events.length === 0 ? t("kiosk.noEventsToday") : t("kiosk.selectEventPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-background">
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name} {event.event_time ? `(${event.event_time.substring(0, 5)})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Time window status */}
          {!windowStatus.allowed && selectedEventId && (
            <Card className="w-full border-2 border-yellow-500">
              <CardContent className="flex items-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm">{t("kiosk.scanUnavailable")}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {windowStatus.reasonParams
                      ? t(windowStatus.reasonKey).replace(/\{(\w+)\}/g, (_, k) => windowStatus.reasonParams?.[k] || "")
                      : t(windowStatus.reasonKey)}
                  </p>
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
              <CardContent className="flex flex-col items-center py-4 sm:py-6 px-3 sm:px-6">
                {feedback === "success" ? (
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mb-2 sm:mb-3" />
                ) : feedback === "duplicate" ? (
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-yellow-500 mb-2 sm:mb-3" />
                ) : (
                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mb-2 sm:mb-3" />
                )}
                {memberName && (
                  <h3 className="text-xl sm:text-2xl font-bold text-center mb-1">{memberName}</h3>
                )}
                {feedback === "success" && selectedEvent && (() => {
                  const scanTime = formatScanTime(new Date().toISOString());
                  const arrivalStatus = getArrivalStatus(new Date().toISOString(), selectedEvent.event_time);
                  const statusKey = getStatusTranslationKey(arrivalStatus);
                  return (
                    <div className="flex flex-col items-center gap-1 mb-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">{t("attendance.scanTime")}: {scanTime}</p>
                      {arrivalStatus && (
                        <Badge variant={getStatusBadgeVariant(arrivalStatus)} className="text-xs sm:text-sm">
                          {t(statusKey)}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
                <p className="text-base sm:text-lg text-center text-muted-foreground">
                  {feedbackMessage}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Scanner - takes maximum available space */}
          {feedback === "idle" && windowStatus.allowed && (
            <div className="w-full flex-1 flex flex-col min-h-0">
              <div className="text-center mb-2 sm:mb-3">
                <Scan className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto mb-1" />
                <h3 className="text-base sm:text-xl font-semibold">{t("kiosk.scanPrompt")}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedEvent?.name} — {selectedEvent?.event_time?.substring(0, 5)}
                </p>
              </div>
              <div className="rounded-xl overflow-hidden border-2 border-primary/20 flex-1 min-h-[250px] sm:min-h-[320px]">
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
            <Card className="w-full flex-1 flex items-center justify-center">
              <CardContent className="flex flex-col items-center py-6 sm:py-8">
                <Clock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-2 sm:mb-3" />
                <p className="text-base sm:text-lg font-semibold">{t("kiosk.noEventsToday")}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{t("kiosk.createEventToActivate")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Footer back button */}
      <div className="px-3 py-2 sm:px-6 sm:py-3">
        <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={() => window.history.back()}>
          ← {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
