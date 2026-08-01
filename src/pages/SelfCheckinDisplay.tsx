import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { Loader2, MapPin, Maximize, Minimize, QrCode, Play, Square, Users, ShieldCheck, ShieldAlert } from "lucide-react";

interface SessionRow {
  id: string;
  event_id: string;
  is_open: boolean;
  venue_lat: number | null;
  venue_lng: number | null;
  radius_m: number;
  require_location: boolean;
  checkin_count: number;
}

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  branch_id: string | null;
}

interface CheckedInRow {
  id: string;
  name: string;
  time: string;
  locationVerified: boolean | null;
}

const COPY = {
  en: {
    title: "Self Check-In",
    subtitle: "Members scan this code with their phone to record their own attendance.",
    start: "Start check-in",
    stop: "Stop check-in",
    starting: "Starting…",
    open: "Open",
    closed: "Closed",
    scanMe: "Scan to check in",
    checkedIn: "Checked in",
    noOne: "No one has checked in yet.",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    radius: "Allowed distance (meters)",
    requireLocation: "Require members to be at the church",
    locationCaptured: "Venue location captured",
    locationMissing: "No venue location — distance will not be checked",
    locationDenied: "Location permission denied. Check-in will still work, but distance can't be checked.",
    refreshes: "Code refreshes automatically",
    eventMissing: "Event not found.",
    back: "Back to events",
    startError: "Could not start the check-in session.",
    unverified: "Location not verified",
  },
  fr: {
    title: "Auto-enregistrement",
    subtitle: "Les membres scannent ce code avec leur téléphone pour enregistrer eux-mêmes leur présence.",
    start: "Démarrer l'enregistrement",
    stop: "Arrêter l'enregistrement",
    starting: "Démarrage…",
    open: "Ouvert",
    closed: "Fermé",
    scanMe: "Scannez pour vous enregistrer",
    checkedIn: "Enregistrés",
    noOne: "Personne ne s'est encore enregistré.",
    fullscreen: "Plein écran",
    exitFullscreen: "Quitter le plein écran",
    radius: "Distance autorisée (mètres)",
    requireLocation: "Exiger que les membres soient à l'église",
    locationCaptured: "Position du lieu enregistrée",
    locationMissing: "Aucune position — la distance ne sera pas vérifiée",
    locationDenied: "Autorisation de localisation refusée. L'enregistrement fonctionnera, mais la distance ne sera pas vérifiée.",
    refreshes: "Le code se renouvelle automatiquement",
    eventMissing: "Événement introuvable.",
    back: "Retour aux événements",
    startError: "Impossible de démarrer la session d'enregistrement.",
    unverified: "Position non vérifiée",
  },
  ht: {
    title: "Otoanrejistreman",
    subtitle: "Manm yo eskane kòd sa a ak telefòn yo pou yo make prezans yo poukont yo.",
    start: "Kòmanse anrejistreman",
    stop: "Fèmen anrejistreman",
    starting: "Ap kòmanse…",
    open: "Ouvè",
    closed: "Fèmen",
    scanMe: "Eskane pou w make prezans ou",
    checkedIn: "Moun ki make prezans",
    noOne: "Pèsonn poko make prezans.",
    fullscreen: "Ekran konplè",
    exitFullscreen: "Kite ekran konplè",
    radius: "Distans otorize (mèt)",
    requireLocation: "Egzije manm yo nan legliz la",
    locationCaptured: "Kote a anrejistre",
    locationMissing: "Pa gen kote — nou p ap tcheke distans",
    locationDenied: "Pèmisyon lokalizasyon refize. Anrejistreman ap mache, men nou p ap tcheke distans.",
    refreshes: "Kòd la chanje otomatikman",
    eventMissing: "Nou pa jwenn evènman an.",
    back: "Tounen nan evènman yo",
    startError: "Nou pa ka kòmanse sesyon an.",
    unverified: "Kote pa verifye",
  },
} as const;

export default function SelfCheckinDisplay() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const c = COPY[(language as keyof typeof COPY)] ?? COPY.en;

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [checkedIn, setCheckedIn] = useState<CheckedInRow[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [radius, setRadius] = useState(200);
  const [requireLocation, setRequireLocation] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkinUrl = useMemo(
    () => (token ? `${window.location.origin}/checkin/${token}` : ""),
    [token],
  );

  // ---- Load event + any open session ----
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      setLoading(true);
      const [{ data: ev }, { data: sess }] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, event_date, event_time, location, branch_id")
          .eq("id", eventId)
          .maybeSingle(),
        supabase
          .from("self_checkin_sessions")
          .select("id, event_id, is_open, venue_lat, venue_lng, radius_m, require_location, checkin_count")
          .eq("event_id", eventId)
          .eq("is_open", true)
          .maybeSingle(),
      ]);
      setEvent(ev as EventRow | null);
      if (sess) {
        setSession(sess as SessionRow);
        setRadius(sess.radius_m);
        setRequireLocation(sess.require_location);
      }
      setLoading(false);
    })();
  }, [eventId]);

  // ---- Rotating token ----
  useEffect(() => {
    if (!session?.is_open) {
      setToken(null);
      return;
    }
    let cancelled = false;

    const fetchToken = async () => {
      const { data, error } = await supabase.functions.invoke("self-checkin?action=token", {
        body: { sessionId: session.id },
      });
      if (cancelled) return;
      if (error || !data?.token) {
        console.error("token error", error);
        return;
      }
      setToken(data.token);
      setSecondsLeft(data.expiresInSeconds ?? 45);
    };

    fetchToken();
    const interval = setInterval(fetchToken, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.id, session?.is_open]);

  // ---- Countdown ----
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- Render QR ----
  useEffect(() => {
    if (canvasRef.current && checkinUrl) {
      QRCode.toCanvas(canvasRef.current, checkinUrl, {
        width: fullscreen ? 460 : 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [checkinUrl, fullscreen]);

  // ---- Live list of check-ins ----
  const loadCheckins = async (sessionId: string) => {
    const { data } = await supabase
      .from("attendance_records")
      .select("id, marked_at, location_verified, members(first_name, last_name)")
      .eq("self_checkin_session_id", sessionId)
      .order("marked_at", { ascending: false })
      .limit(20);

    setCheckedIn(
      (data ?? []).map((r: any) => ({
        id: r.id,
        name: `${r.members?.first_name ?? ""} ${r.members?.last_name ?? ""}`.trim(),
        time: r.marked_at
          ? new Date(r.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        locationVerified: r.location_verified,
      })),
    );
  };

  useEffect(() => {
    if (!session?.id) return;
    loadCheckins(session.id);

    const channel = supabase
      .channel(`self-checkin-${session.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "attendance_records", filter: `self_checkin_session_id=eq.${session.id}` },
        () => loadCheckins(session.id),
      )
      .subscribe();

    const poll = setInterval(() => loadCheckins(session.id), 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [session?.id]);

  const getPosition = () =>
    new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });

  const handleStart = async () => {
    if (!eventId || !tenantId || !event) return;
    setStarting(true);
    try {
      const pos = await getPosition();
      if (!pos) setLocationDenied(true);

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("self_checkin_sessions")
        .insert({
          tenant_id: tenantId,
          event_id: eventId,
          branch_id: event.branch_id,
          venue_lat: pos?.coords.latitude ?? null,
          venue_lng: pos?.coords.longitude ?? null,
          radius_m: radius,
          require_location: requireLocation && !!pos,
          is_open: true,
        })
        .select("id, event_id, is_open, venue_lat, venue_lng, radius_m, require_location, checkin_count")
        .single();

      if (error) throw error;
      void userData;
      setSession(data as SessionRow);
    } catch (err: any) {
      console.error(err);
      toast({ title: c.startError, description: err?.message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    const { error } = await supabase
      .from("self_checkin_sessions")
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq("id", session.id);
    if (error) {
      toast({ title: c.startError, description: error.message, variant: "destructive" });
      return;
    }
    setSession({ ...session, is_open: false });
    setToken(null);
  };

  const board = (
    <div className={`flex flex-col items-center gap-6 ${fullscreen ? "p-8" : ""}`}>
      <div className="text-center space-y-1">
        <h2 className={`font-bold ${fullscreen ? "text-5xl" : "text-2xl"}`}>{event?.name}</h2>
        <p className="text-muted-foreground">{c.scanMe}</p>
      </div>

      {token ? (
        <div className="bg-white p-4 rounded-xl shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      ) : (
        <div className="h-[300px] w-[300px] flex items-center justify-center rounded-xl border border-dashed">
          <QrCode className="h-16 w-16 text-muted-foreground/30" />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {c.refreshes} · {secondsLeft}s
      </p>

      <div className="flex items-center gap-2 text-lg font-semibold">
        <Users className="h-5 w-5" />
        {checkedIn.length > 0 ? checkedIn.length : 0} {c.checkedIn}
      </div>

      <div className={`w-full ${fullscreen ? "max-w-3xl" : "max-w-md"} space-y-2`}>
        {checkedIn.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">{c.noOne}</p>
        ) : (
          checkedIn.slice(0, fullscreen ? 12 : 6).map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-2"
            >
              <span className={fullscreen ? "text-xl" : "text-sm"}>{row.name}</span>
              <span className="flex items-center gap-2 text-muted-foreground text-sm">
                {row.locationVerified === false && (
                  <ShieldAlert className="h-4 w-4 text-amber-500" aria-label={c.unverified} />
                )}
                {row.locationVerified === true && <ShieldCheck className="h-4 w-4 text-green-600" />}
                {row.time}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-auto">
        <div className="flex justify-end p-4">
          <Button variant="outline" size="sm" onClick={() => setFullscreen(false)}>
            <Minimize className="h-4 w-4 mr-1" />
            {c.exitFullscreen}
          </Button>
        </div>
        {board}
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{c.title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{c.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/events")}>
              {c.back}
            </Button>
            {session?.is_open && (
              <Button variant="outline" onClick={() => setFullscreen(true)}>
                <Maximize className="h-4 w-4 mr-1" />
                {c.fullscreen}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !event ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{c.eventMissing}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {event.name}
                  <Badge variant={session?.is_open ? "default" : "outline"}>
                    {session?.is_open ? c.open : c.closed}
                  </Badge>
                </CardTitle>
                <CardDescription>{event.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!session?.is_open && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="radius">{c.radius}</Label>
                      <Input
                        id="radius"
                        type="number"
                        min={50}
                        max={5000}
                        value={radius}
                        onChange={(e) => setRadius(Number(e.target.value) || 200)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="require-loc" className="text-sm font-normal">
                        {c.requireLocation}
                      </Label>
                      <Switch id="require-loc" checked={requireLocation} onCheckedChange={setRequireLocation} />
                    </div>
                  </>
                )}

                {session && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>{session.venue_lat !== null ? c.locationCaptured : c.locationMissing}</span>
                  </div>
                )}

                {locationDenied && !session && (
                  <p className="text-sm text-amber-600">{c.locationDenied}</p>
                )}

                {session?.is_open ? (
                  <Button variant="destructive" className="w-full" onClick={handleStop}>
                    <Square className="h-4 w-4 mr-1" />
                    {c.stop}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleStart} disabled={starting}>
                    {starting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-1" />
                    )}
                    {starting ? c.starting : c.start}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardContent className="py-8">{board}</CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
