import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Plus, TrendingUp, Users, BarChart3, Scan, CheckCircle, XCircle, Maximize, Minimize, Camera, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AttendanceDialog from "@/components/AttendanceDialog";
import ScannerSettings, { ScannerSoundSettings } from "@/components/ScannerSettings";
import CameraScanner, { ScanFeedbackStatus } from "@/components/CameraScanner";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatar } from "@/components/SignedAvatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useCurrentTenant, getCurrentUserTenantId } from "@/hooks/useCurrentTenant";

interface TodayEvent {
  id: string;
  name: string;
  event_time: string | null;
  status: string;
}

interface AttendanceRecord {
  event_type: string;
  event_date: string;
  total: number;
}

interface AttendanceStats {
  avgAttendance: number;
  totalEvents: number;
  highestAttendance: number;
  highestDate: string;
  percentageChange: number;
}

interface ScannedMember {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  time: string;
  status: 'success' | 'error';
}

export default function Attendance() {
  const { hasFeature, loading: planLoading } = usePlanLimits();
  const { t } = useLanguage();

  // Check for attendance feature access
  if (!planLoading && !hasFeature("attendance")) {
    return (
      <Layout>
        <FeatureLockedCard
          featureName={t("attendance.title")}
          featureDescription={t("attendance.subtitle")}
          requiredPlan="essentiel"
          icon={<Calendar className="w-8 h-8 text-muted-foreground" />}
        />
      </Layout>
    );
  }

  if (planLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">{t("common.loading")}</div>
        </div>
      </Layout>
    );
  }

  return <AttendanceContent />;
}

function AttendanceContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [kioskCameraActive, setKioskCameraActive] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [scannedMembers, setScannedMembers] = useState<ScannedMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats>({
    avgAttendance: 0,
    totalEvents: 0,
    highestAttendance: 0,
    highestDate: "",
    percentageChange: 0,
  });
  const [totalMembers, setTotalMembers] = useState(0);
  const [soundSettings, setSoundSettings] = useState<ScannerSoundSettings>({
    enabled: true,
    volume: 50,
    successSound: "/success-beep.mp3",
    errorSound: "/error-beep.mp3",
    continuousMode: true,
    soundStyle: "musical",
  });
  const [scanCount, setScanCount] = useState(0);
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [scanFeedbackStatus, setScanFeedbackStatus] = useState<ScanFeedbackStatus>(null);
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<string>("");

  useEffect(() => {
    loadAttendanceRecords();
    loadTotalMembers();
    loadTodayEvents();

    // Subscribe to real-time updates for attendance records
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records'
        },
        () => {
          // Reload attendance records when any change happens
          loadAttendanceRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Keep scanner input focused when in scanner mode or kiosk mode
  useEffect(() => {
    if ((scannerMode || kioskMode) && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scannerMode, kioskMode]);

  const playSound = (type: "success" | "error") => {
    if (!soundSettings.enabled) return;
    
    const volume = soundSettings.volume / 100;
    
    // Dynamic import to avoid issues with SSR
    import("@/lib/soundGenerator").then(({ playSuccessSound, playErrorSound, playMemberAnnounceSound }) => {
      if (type === "success") {
        if (soundSettings.soundStyle === "musical") {
          playSuccessSound(volume);
        } else if (soundSettings.soundStyle === "ascending") {
          playMemberAnnounceSound(scanCount, volume);
          setScanCount(prev => prev + 1);
        } else {
          // Classic file-based sound
          try {
            const audio = new Audio(soundSettings.successSound);
            audio.volume = volume;
            audio.play().catch(() => {});
          } catch (e) {
            console.error("Error playing sound:", e);
          }
        }
      } else {
        if (soundSettings.soundStyle === "classic") {
          try {
            const audio = new Audio(soundSettings.errorSound);
            audio.volume = volume;
            audio.play().catch(() => {});
          } catch (e) {
            console.error("Error playing sound:", e);
          }
        } else {
          playErrorSound(volume);
        }
      }
    });
  };

  const handleQrCodeScan = useCallback(async (qrCode: string) => {
    if (!qrCode.trim()) return;

    // Block scanning if no event is selected
    if (!selectedEventId) {
      setScanFeedbackStatus('error');
      setScanFeedbackMessage(t("attendance.eventRequiredToScan"));
      setTimeout(() => {
        setScanFeedbackStatus(null);
        setScanFeedbackMessage("");
      }, 2000);
      toast({
        title: t("attendance.error"),
        description: t("attendance.eventRequiredToScan"),
        variant: "destructive",
      });
      setQrCodeInput("");
      return;
    }

    const scannedCode = qrCode.trim();

    // Resolve tenant at scan-time to avoid RLS insert failures when tenant hook isn't ready yet
    const effectiveTenantId = tenantId || (await (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return getCurrentUserTenantId(user.id);
    })());

    if (!effectiveTenantId) {
      setScanFeedbackStatus('error');
      setScanFeedbackMessage(t("attendance.error") || "Error");
      setTimeout(() => {
        setScanFeedbackStatus(null);
        setScanFeedbackMessage("");
      }, 2000);

      toast({
        title: t("attendance.error"),
        description: t("attendance.attendanceRecordError"),
        variant: "destructive",
      });
      setQrCodeInput("");
      return;
    }

    try {
      // Find member by QR code OR member_number (for flexibility)
      let member = null;
      let error = null;

      // First try by qr_code
      const { data: memberByQr, error: qrError } = await supabase
        .from("members")
        .select("id, first_name, last_name, photo_url")
        .eq("tenant_id", effectiveTenantId)
        .eq("qr_code", scannedCode)
        .eq("status", "active")
        .maybeSingle();

      if (qrError) {
        console.error("Error searching by qr_code:", qrError);
        error = qrError;
      } else if (memberByQr) {
        member = memberByQr;
      }

      // If not found by qr_code, try by member_number
      if (!member) {
        const { data: memberByNumber, error: numError } = await supabase
          .from("members")
          .select("id, first_name, last_name, photo_url")
          .eq("tenant_id", effectiveTenantId)
          .eq("member_number", scannedCode)
          .eq("status", "active")
          .maybeSingle();

        if (numError) {
          console.error("Error searching by member_number:", numError);
        } else if (memberByNumber) {
          member = memberByNumber;
        }
      }

      // If still not found, try partial match on qr_code or member_number
      if (!member) {
        const { data: memberByPartial, error: partialError } = await supabase
          .from("members")
          .select("id, first_name, last_name, photo_url")
          .eq("tenant_id", effectiveTenantId)
          .eq("status", "active")
          .or(`qr_code.ilike.%${scannedCode}%,member_number.ilike.%${scannedCode}%`)
          .limit(1)
          .maybeSingle();

        if (!partialError && memberByPartial) {
          member = memberByPartial;
        }
      }

      if (!member) {
        // Set feedback for camera scanner (error - not found)
        setScanFeedbackStatus('error');
        setScanFeedbackMessage(t("attendance.memberNotFound") || "Membre non trouvé");
        setTimeout(() => {
          setScanFeedbackStatus(null);
          setScanFeedbackMessage("");
        }, 2000);
        
        toast({
          title: t("attendance.memberNotFound"),
          description: t("attendance.qrCodeNotFound").replace("{qrCode}", scannedCode),
          variant: "destructive",
        });
        
        playSound("error");
        
        setScannedMembers(prev => [{
          id: scannedCode,
          first_name: t("attendance.unknown"),
          last_name: `(${scannedCode})`,
          photo_url: null,
          time: new Date().toLocaleTimeString("fr-FR"),
          status: 'error' as const
        }, ...prev].slice(0, 10));
        
        setQrCodeInput("");
        return;
      }

      // Mark attendance for today - use local date to avoid timezone issues
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // Get selected event info - only use if selectedEventId is valid and exists in todayEvents
      const selectedEvent = selectedEventId ? todayEvents.find(e => e.id === selectedEventId) : null;
      const eventType = selectedEvent?.name || "Culte";
      const eventIdToUse = selectedEvent ? selectedEventId : null;
      
      // Check if already marked today for this event (or any event if no event selected)
      let existingQuery = supabase
        .from("attendance_records")
        .select("id")
        .eq("tenant_id", effectiveTenantId)
        .eq("member_id", member.id)
        .eq("event_date", today);
      
      if (eventIdToUse) {
        existingQuery = existingQuery.eq("event_id", eventIdToUse);
      } else {
        // If no specific event, check for any attendance today without event_id
        existingQuery = existingQuery.is("event_id", null);
      }
      
      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        // Build message based on whether an event is selected
        let description: string;
        if (selectedEvent) {
          description = t("attendance.alreadyMarkedForEvent")
            .replace("{name}", `${member.first_name} ${member.last_name}`)
            .replace("{event}", selectedEvent.name);
        } else {
          description = t("attendance.alreadyMarkedToday")
            .replace("{name}", `${member.first_name} ${member.last_name}`);
        }
        
        // Set feedback for camera scanner (duplicate)
        setScanFeedbackStatus('duplicate');
        setScanFeedbackMessage(`${member.first_name} ${member.last_name} - ${t("attendance.alreadyMarked") || "Déjà présent"}`);
        setTimeout(() => {
          setScanFeedbackStatus(null);
          setScanFeedbackMessage("");
        }, 2000);
        
        toast({
          title: t("attendance.alreadyMarked"),
          description,
          variant: "destructive",
        });

        playSound("error");

        setScannedMembers(prev => [{
          ...member,
          time: new Date().toLocaleTimeString("fr-FR"),
          status: 'error' as const
        }, ...prev].slice(0, 10));
        
        setQrCodeInput("");
        return;
      }

      // Insert attendance record
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          member_id: member.id,
          event_date: today,
          event_type: eventType,
          event_id: eventIdToUse,
          scan_method: "qr_scan",
          tenant_id: effectiveTenantId,
          marked_by: currentUser?.id || null,
        });

      if (insertError) {
        // Handle unique constraint violation (race condition fallback)
        if (insertError.code === '23505') {
          setScanFeedbackStatus('duplicate');
          setScanFeedbackMessage(`${member.first_name} ${member.last_name} - ${t("attendance.alreadyMarked") || "Déjà présent"}`);
          setTimeout(() => {
            setScanFeedbackStatus(null);
            setScanFeedbackMessage("");
          }, 2000);
          toast({
            title: t("attendance.alreadyMarked"),
            description: t("attendance.alreadyMarkedToday").replace("{name}", `${member.first_name} ${member.last_name}`),
            variant: "destructive",
          });
          playSound("error");
          setQrCodeInput("");
          return;
        }
        throw insertError;
      }

      // Success feedback
      setScanFeedbackStatus('success');
      setScanFeedbackMessage(`${member.first_name} ${member.last_name} - ${t("attendance.attendanceMarked") || "Présent"}`);
      setTimeout(() => {
        setScanFeedbackStatus(null);
        setScanFeedbackMessage("");
      }, 2000);
      
      toast({
        title: t("attendance.attendanceMarked"),
        description: t("attendance.memberMarkedPresent").replace("{name}", `${member.first_name} ${member.last_name}`),
      });

      playSound("success");

      setScannedMembers(prev => [{
        ...member,
        time: new Date().toLocaleTimeString("fr-FR"),
        status: 'success' as const
      }, ...prev].slice(0, 10));

      await loadAttendanceRecords();
    } catch (error: any) {
      console.error("Error scanning QR code:", error);
      
      // Show specific error details for debugging
      const errorDetail = error?.message || error?.details || error?.hint || JSON.stringify(error);
      console.error("Detailed scan error:", errorDetail);
      
      setScanFeedbackStatus('error');
      setScanFeedbackMessage(t("attendance.attendanceRecordError") || "Erreur d'enregistrement");
      setTimeout(() => {
        setScanFeedbackStatus(null);
        setScanFeedbackMessage("");
      }, 2000);
      
      toast({
        title: t("attendance.error"),
        description: `${t("attendance.attendanceRecordError")} - ${errorDetail}`,
        variant: "destructive",
      });
    } finally {
      setQrCodeInput("");
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }
  }, [toast, t, playSound, kioskCameraActive, cameraActive, selectedEventId, todayEvents, tenantId]);

  const handleScanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrCodeInput(e.target.value);
  };

  const handleScanInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQrCodeScan(qrCodeInput);
    }
  };

  const loadTotalMembers = async () => {
    try {
      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (error) throw error;
      setTotalMembers(count || 0);
    } catch (error) {
      console.error("Error loading total members:", error);
    }
  };

  const loadTodayEvents = async () => {
    try {
      // Use local date to avoid timezone issues
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      console.log("Loading events for today:", today);
      
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_time, status")
        .eq("event_date", today)
        .in("status", ["planned", "confirmed"])
        .order("event_time", { ascending: true });

      if (error) throw error;
      
      console.log("Events found:", data);
      setTodayEvents(data || []);
      
      // Auto-select first event if available
      if (data && data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading today events:", error);
    }
  };

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      
      // Get all attendance records
      const { data, error } = await supabase
        .from("attendance_records")
        .select("event_type, event_date")
        .order("event_date", { ascending: false });

      if (error) throw error;

      // Group by event and date to get totals
      const grouped = (data || []).reduce((acc: Record<string, AttendanceRecord>, record) => {
        const key = `${record.event_type}-${record.event_date}`;
        if (!acc[key]) {
          acc[key] = {
            event_type: record.event_type,
            event_date: record.event_date,
            total: 0,
          };
        }
        acc[key].total += 1;
        return acc;
      }, {});

      const records = Object.values(grouped);
      setAttendanceRecords(records);

      // Calculate stats
      if (records.length > 0) {
        const totals = records.map((r) => r.total);
        const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
        const highest = Math.max(...totals);
        const highestRecord = records.find((r) => r.total === highest);

        // Get last 30 days for current period
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const currentPeriod = records.filter(
          (r) => new Date(r.event_date) >= thirtyDaysAgo
        );

        // Get previous 30 days
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const previousPeriod = records.filter(
          (r) =>
            new Date(r.event_date) >= sixtyDaysAgo &&
            new Date(r.event_date) < thirtyDaysAgo
        );

        const currentAvg =
          currentPeriod.length > 0
            ? currentPeriod.reduce((a, b) => a + b.total, 0) / currentPeriod.length
            : 0;
        const previousAvg =
          previousPeriod.length > 0
            ? previousPeriod.reduce((a, b) => a + b.total, 0) / previousPeriod.length
            : 0;

        const percentageChange =
          previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

        setStats({
          avgAttendance: Math.round(avg),
          totalEvents: records.length,
          highestAttendance: highest,
          highestDate: highestRecord?.event_date || "",
          percentageChange: Math.round(percentageChange),
        });
      }
    } catch (error) {
      console.error("Error loading attendance records:", error);
    } finally {
      setLoading(false);
    }
  };

  // Kiosk Mode Full Screen View
  if (kioskMode) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Hidden scanner input for external scanner */}
        {!kioskCameraActive && (
          <Input
            ref={scanInputRef}
            type="text"
            value={qrCodeInput}
            onChange={handleScanInputChange}
            onKeyDown={handleScanInputKeyDown}
            onBlur={() => scanInputRef.current?.focus()}
            className="absolute opacity-0 pointer-events-none"
            autoFocus
          />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-card">
          <div className="flex-1">
            <h1 className="text-4xl font-bold">{t("attendance.kioskMode")} - {t("nav.attendance")}</h1>
            <p className="text-xl text-muted-foreground mt-1">{t("attendance.scanQrToMarkAttendance")}</p>
            {/* Event selector in kiosk */}
            <div className="mt-3">
              <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full max-w-md text-lg">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  <SelectValue placeholder={todayEvents.length === 0 ? t("attendance.noEventToday") : t("attendance.selectAnEvent")} />
                </SelectTrigger>
                <SelectContent>
                  {todayEvents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {t("attendance.noEventScheduled")}
                    </SelectItem>
                  ) : (
                    todayEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} {event.event_time ? `(${event.event_time.substring(0, 5)})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              size="lg"
              variant={kioskCameraActive ? "default" : "outline"}
              onClick={() => setKioskCameraActive(!kioskCameraActive)}
              disabled={!selectedEventId}
            >
              <Camera className="mr-2 h-5 w-5" />
              {kioskCameraActive ? t("attendance.stopCamera") : t("attendance.startCamera")}
            </Button>
            <ScannerSettings onSettingsChange={setSoundSettings} />
            <Button 
              size="lg"
              variant="outline"
              onClick={() => {
                setKioskMode(false);
                setKioskCameraActive(false);
              }}
            >
              <Minimize className="mr-2 h-5 w-5" />
              {t("attendance.closeKioskMode")}
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedEventId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CalendarDays className="h-32 w-32 text-muted-foreground/20 mb-6" />
              <h2 className="text-3xl font-semibold text-muted-foreground mb-2">{t("attendance.selectEventToStart")}</h2>
              <p className="text-xl text-muted-foreground">{t("attendance.eventRequiredToScan")}</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Camera Scanner Section */}
            {kioskCameraActive && (
              <div className="flex flex-col">
                <Card className="flex-1 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      {t("attendance.cameraScanner")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CameraScanner 
                      onScan={handleQrCodeScan}
                      isActive={kioskCameraActive}
                      onActiveChange={setKioskCameraActive}
                      feedbackStatus={scanFeedbackStatus}
                      feedbackMessage={scanFeedbackMessage}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Scanned Members Grid */}
            <div className={`flex flex-col ${kioskCameraActive ? '' : 'lg:col-span-2'}`}>
              {scannedMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Scan className="h-32 w-32 text-muted-foreground/20 mb-6" />
                  <h2 className="text-3xl font-semibold text-muted-foreground mb-2">{t("attendance.readyToScan")}</h2>
                  <p className="text-xl text-muted-foreground">{t("attendance.scanQrToStart")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scannedMembers.map((member, index) => (
                    <Card 
                      key={`${member.id}-${index}`}
                      className={`overflow-hidden transition-all duration-300 ${
                        member.status === 'success' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                          : 'border-red-500 border-4 bg-red-100 dark:bg-red-950/40 animate-pulse'
                      } ${index === 0 ? 'ring-4 ring-primary' : ''}`}
                    >
                      {/* Error banner for duplicate scans */}
                      {member.status === 'error' && (
                        <div className="bg-red-600 text-white py-3 px-4 flex items-center justify-center gap-2">
                          <XCircle className="h-6 w-6" />
                          <span className="text-xl font-bold tracking-wide">{t("attendance.codeAlreadyScanned")}</span>
                        </div>
                      )}
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className={`h-20 w-20 border-4 shadow-lg ${
                            member.status === 'success' 
                              ? 'border-green-500' 
                              : 'border-red-500'
                          }`}>
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="text-2xl">
                              {member.first_name[0]}{member.last_name[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className={`text-2xl mb-1 ${member.status === 'error' ? 'text-red-700 dark:text-red-400' : ''}`}>
                              {member.first_name} {member.last_name}
                            </CardTitle>
                            <p className="text-lg text-muted-foreground">{member.time}</p>
                            {member.status === 'error' && (
                              <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                                {t("attendance.duplicateScan")}
                              </p>
                            )}
                          </div>
                          {member.status === 'success' ? (
                            <CheckCircle className="h-16 w-16 text-green-600" />
                          ) : (
                            <XCircle className="h-16 w-16 text-red-600" />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Badge 
                          variant={member.status === 'success' ? 'default' : 'destructive'}
                          className={`text-lg px-4 py-2 w-full justify-center ${
                            member.status === 'error' ? 'bg-red-600 hover:bg-red-700 text-white text-xl py-3' : ''
                          }`}
                        >
                          {member.status === 'success' 
                            ? `✓ ${t("attendance.attendanceMarked")}` 
                            : `✗ ${t("attendance.codeAlreadyScanned")}`}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t bg-card p-6">
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("attendance.totalScansToday")}</p>
              <p className="text-4xl font-bold text-primary">{scannedMembers.filter(m => m.status === 'success').length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("attendance.errors")}</p>
              <p className="text-4xl font-bold text-destructive">{scannedMembers.filter(m => m.status === 'error').length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("attendance.successRate")}</p>
              <p className="text-4xl font-bold text-green-600">
                {scannedMembers.length > 0 
                  ? Math.round((scannedMembers.filter(m => m.status === 'success').length / scannedMembers.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("attendance.title")}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {t("attendance.trackMemberAttendance")}
            </p>
          </div>
          
          {/* Event Selector - Always show */}
          <div className="w-full sm:w-auto">
            <Select value={selectedEventId || ""} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <CalendarDays className="mr-2 h-4 w-4" />
                <SelectValue placeholder={todayEvents.length === 0 ? t("attendance.noEventToday") : t("attendance.selectAnEvent")} />
              </SelectTrigger>
              <SelectContent>
                {todayEvents.length === 0 ? (
                  <SelectItem value="none" disabled>
                    {t("attendance.noEventScheduled")}
                  </SelectItem>
                ) : (
                  todayEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} {event.event_time ? `(${event.event_time.substring(0, 5)})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <ScannerSettings onSettingsChange={setSoundSettings} />
            <Button 
              variant={scannerMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setScannerMode(!scannerMode)}
              className="flex-1 sm:flex-none"
            >
              <Scan className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{scannerMode ? t("attendance.closeScanner") : t("attendance.openScanner")}</span>
              <span className="sm:hidden">Scanner</span>
            </Button>
            <Button 
              variant={kioskMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => {
                setKioskMode(!kioskMode);
                if (!kioskMode) {
                  setScannerMode(false);
                }
              }}
              className="flex-1 sm:flex-none"
            >
              <Maximize className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("attendance.kioskMode")}</span>
              <span className="sm:hidden">Kiosk</span>
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("attendance.recordAttendance")}</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* QR Scanner Section */}
        {scannerMode && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                {t("attendance.scanQrCode")}
              </CardTitle>
              <CardDescription>
                {t("attendance.clickFieldToScan")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="external" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="external" className="gap-2">
                    <Scan className="h-4 w-4" />
                    {t("attendance.externalScanner")}
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-2">
                    <Camera className="h-4 w-4" />
                    {t("attendance.cameraScanner")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="external" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("attendance.scanField")}</label>
                    <Input
                      ref={scanInputRef}
                      type="text"
                      value={qrCodeInput}
                      onChange={handleScanInputChange}
                      onKeyDown={handleScanInputKeyDown}
                      onBlur={() => scanInputRef.current?.focus()}
                      placeholder={t("attendance.scanQrHere")}
                      className="text-lg font-mono"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("attendance.scannerAutoType")}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="camera" className="space-y-4 mt-4">
                  <CameraScanner 
                    onScan={handleQrCodeScan}
                    isActive={cameraActive}
                    onActiveChange={setCameraActive}
                    feedbackStatus={scanFeedbackStatus}
                    feedbackMessage={scanFeedbackMessage}
                  />
                </TabsContent>
              </Tabs>

              {scannedMembers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t("attendance.lastScans")} ({scannedMembers.length})</h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {scannedMembers.map((member, index) => (
                      <div
                        key={`${member.id}-${index}`}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          member.status === 'success' 
                            ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                            : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                        }`}
                      >
                        {member.status === 'success' ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.photo_url || undefined} />
                          <AvatarFallback>
                            {member.first_name[0]}{member.last_name[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.time}</p>
                        </div>
                        <Badge variant={member.status === 'success' ? 'default' : 'destructive'}>
                          {member.status === 'success' ? t("attendance.success") : t("attendance.error")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("attendance.totalMembers")}</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">{t("attendance.activeMembers")}</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("attendance.lastMeeting")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {attendanceRecords.length > 0
                  ? attendanceRecords[0].total
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {attendanceRecords.length > 0
                  ? new Date(attendanceRecords[0].event_date).toLocaleDateString("fr-FR")
                  : t("attendance.noMeetings")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("attendance.averagePercentage")}
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalMembers > 0 && stats.avgAttendance > 0
                  ? Math.round((stats.avgAttendance / totalMembers) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.avgAttendance} / {totalMembers} {t("attendance.onAverage")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("attendance.averageAttendance")}
              </CardTitle>
              <TrendingUp className={`h-4 w-4 ${stats.percentageChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgAttendance}</div>
              <p className="text-xs text-muted-foreground">
                {stats.percentageChange >= 0 ? '+' : ''}{stats.percentageChange}% {t("attendance.vsPreviousPeriod")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("attendance.totalMeetings")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">{t("attendance.totalRecorded")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("attendance.highestAttendance")}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highestAttendance}</div>
              <p className="text-xs text-muted-foreground">
                {stats.highestDate ? (() => {
                  const [year, month, day] = stats.highestDate.split('-').map(Number);
                  return new Date(year, month - 1, day).toLocaleDateString("fr-FR");
                })() : "-"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>{t("attendance.recentAttendance")}</CardTitle>
            <CardDescription>
              {t("attendance.attendanceHistoryDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("attendance.event")}</TableHead>
                    <TableHead>{t("attendance.date")}</TableHead>
                    <TableHead>{t("attendance.totalPresent")}</TableHead>
                    <TableHead>{t("attendance.percentage")}</TableHead>
                    <TableHead className="text-right">{t("attendance.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("attendance.loading")}
                      </TableCell>
                    </TableRow>
                  ) : attendanceRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("attendance.noAttendanceRecords")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRecords.map((record, index) => {
                      const percentage = totalMembers > 0 
                        ? Math.round((record.total / totalMembers) * 100)
                        : 0;
                      
                      // Parse date without timezone conversion
                      const [year, month, day] = record.event_date.split('-').map(Number);
                      const displayDate = new Date(year, month - 1, day).toLocaleDateString("fr-FR");
                      
                      return (
                        <TableRow key={`${record.event_type}-${record.event_date}-${index}`}>
                          <TableCell className="font-medium">{record.event_type}</TableCell>
                          <TableCell>{displayDate}</TableCell>
                          <TableCell>{record.total}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{percentage}%</span>
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate("/attendance/stats")}
                            >
                              {t("attendance.statistics")}
                            </Button>
                          </TableCell>
                        </TableRow>
                       );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      <AttendanceDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={loadAttendanceRecords}
      />
    </Layout>
  );
}
