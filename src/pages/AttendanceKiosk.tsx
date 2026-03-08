import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCurrentUserTenantId } from "@/hooks/useCurrentTenant";
import { useAuth } from "@/hooks/useAuth";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Maximize, Minimize, CheckCircle, XCircle, Scan, Church } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraScanner from "@/components/CameraScanner";
import { playSuccessSound, playErrorSound } from "@/lib/soundGenerator";

type FeedbackStatus = "idle" | "success" | "error" | "duplicate";

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

  const resetFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setFeedback("idle");
      setFeedbackMessage("");
      setMemberName("");
    }, 3000);
  }, []);

  const handleScan = useCallback(async (code: string) => {
    if (!code || code === debounceRef.current) return;
    debounceRef.current = code;
    setTimeout(() => { debounceRef.current = ""; }, 15000);

    const match = code.match(/^MEMBER-(.+)$/);
    if (!match) {
      setFeedback("error");
      setFeedbackMessage(t("kiosk.invalidQR"));
      playErrorSound(80);
      resetFeedback();
      return;
    }

    const memberId = match[1];
    const resolvedTenantId = await getCurrentUserTenantId();
    if (!resolvedTenantId) {
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
        .eq("tenant_id", resolvedTenantId)
        .single();

      if (!member) {
        setFeedback("error");
        setFeedbackMessage(t("kiosk.memberNotFound"));
        playErrorSound(80);
        resetFeedback();
        return;
      }

      const fullName = `${member.first_name} ${member.last_name}`;
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("attendance_records").insert({
        member_id: memberId,
        event_type: "service",
        event_date: today,
        scan_method: "qr_scan",
        marked_by: user?.id || null,
        tenant_id: resolvedTenantId,
      });

      if (error) {
        if (error.code === "23505") {
          setFeedback("duplicate");
          setMemberName(fullName);
          setFeedbackMessage(t("kiosk.alreadyCheckedIn"));
          playErrorSound(80);
        } else {
          throw error;
        }
      } else {
        setFeedback("success");
        setMemberName(fullName);
        setFeedbackMessage(t("kiosk.welcomeMessage"));
        setTotalCheckins(prev => prev + 1);
        playSuccessSound(80);
      }
    } catch (err) {
      console.error("Kiosk scan error:", err);
      setFeedback("error");
      setFeedbackMessage(t("kiosk.scanError"));
      playErrorSound(80);
    }

    resetFeedback();
  }, [user, t, resetFeedback]);

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

        {feedback === "idle" && (
          <div className="w-full">
            <div className="text-center mb-4">
              <Scan className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-xl font-semibold">{t("kiosk.scanPrompt")}</h3>
              <p className="text-sm text-muted-foreground">{t("kiosk.scanInstructions")}</p>
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
      </div>

      <div className="absolute bottom-4 left-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          ← {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
