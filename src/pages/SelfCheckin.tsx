import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CameraScanner from "@/components/CameraScanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, Loader2, MapPin, QrCode, XCircle, AlertTriangle } from "lucide-react";

const COPY = {
  en: {
    heading: "Self Check-In",
    loading: "Checking the code…",
    identify: "Identify yourself",
    identifyHint: "Enter your member number or your phone number.",
    placeholder: "Member number or phone",
    submit: "Check me in",
    scanCard: "Scan my member card instead",
    typeInstead: "Type my number instead",
    locating: "Getting your location…",
    checkedIn: "You're checked in!",
    already: "You were already checked in.",
    welcome: "Welcome",
    locationUnverified: "We couldn't verify your location, but your attendance was recorded.",
    errors: {
      invalid_token: "This code is no longer valid. Please scan the code on the screen again.",
      expired_token: "This code expired. Please scan the code on the screen again.",
      session_closed: "Check-in is closed for this event.",
      session_not_found: "Check-in session not found.",
      location_required: "Please allow location so we can confirm you are at the church.",
      too_far: "You must be at the church to check in.",
      member_not_found: "We couldn't find you — please see a greeter.",
      rate_limited: "Too many attempts. Please wait a moment.",
      identity_required: "Please enter your member number or phone.",
      server_error: "Something went wrong. Please try again.",
    },
  },
  fr: {
    heading: "Auto-enregistrement",
    loading: "Vérification du code…",
    identify: "Identifiez-vous",
    identifyHint: "Entrez votre numéro de membre ou votre numéro de téléphone.",
    placeholder: "Numéro de membre ou téléphone",
    submit: "Enregistrer ma présence",
    scanCard: "Scanner plutôt ma carte de membre",
    typeInstead: "Saisir plutôt mon numéro",
    locating: "Localisation en cours…",
    checkedIn: "Votre présence est enregistrée !",
    already: "Votre présence était déjà enregistrée.",
    welcome: "Bienvenue",
    locationUnverified: "Position non vérifiée, mais votre présence a été enregistrée.",
    errors: {
      invalid_token: "Ce code n'est plus valide. Scannez à nouveau le code affiché.",
      expired_token: "Ce code a expiré. Scannez à nouveau le code affiché.",
      session_closed: "L'enregistrement est fermé pour cet événement.",
      session_not_found: "Session d'enregistrement introuvable.",
      location_required: "Autorisez la localisation pour confirmer que vous êtes à l'église.",
      too_far: "Vous devez être à l'église pour vous enregistrer.",
      member_not_found: "Nous ne vous trouvons pas — voyez un accueillant.",
      rate_limited: "Trop de tentatives. Patientez un instant.",
      identity_required: "Entrez votre numéro de membre ou téléphone.",
      server_error: "Une erreur est survenue. Réessayez.",
    },
  },
  ht: {
    heading: "Otoanrejistreman",
    loading: "N ap tcheke kòd la…",
    identify: "Idantifye tèt ou",
    identifyHint: "Antre nimewo manm ou oswa nimewo telefòn ou.",
    placeholder: "Nimewo manm oswa telefòn",
    submit: "Make prezans mwen",
    scanCard: "Eskane kat manm mwen pito",
    typeInstead: "Ekri nimewo m pito",
    locating: "N ap chèche kote w ye…",
    checkedIn: "Prezans ou make!",
    already: "Prezans ou te deja make.",
    welcome: "Byenveni",
    locationUnverified: "Nou pa t ka verifye kote w ye, men prezans ou anrejistre.",
    errors: {
      invalid_token: "Kòd sa a pa valab ankò. Eskane kòd ki sou ekran an ankò.",
      expired_token: "Kòd la ekspire. Eskane kòd ki sou ekran an ankò.",
      session_closed: "Anrejistreman fèmen pou evènman sa a.",
      session_not_found: "Nou pa jwenn sesyon an.",
      location_required: "Bay pèmisyon lokalizasyon pou nou konfime ou nan legliz la.",
      too_far: "Ou dwe nan legliz la pou w make prezans ou.",
      member_not_found: "Nou pa jwenn ou — al wè yon akeyan.",
      rate_limited: "Twòp tantativ. Tann yon ti moman.",
      identity_required: "Antre nimewo manm ou oswa telefòn ou.",
      server_error: "Gen yon pwoblèm. Eseye ankò.",
    },
  },
} as const;

interface ResolveInfo {
  sessionId: string;
  requireLocation: boolean;
  event: { name: string; event_date: string; event_time: string | null; location: string | null } | null;
  church: { name: string; logoUrl: string | null; primaryColor: string | null } | null;
}

export default function SelfCheckin() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY)] ?? COPY.en;

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ResolveInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [result, setResult] = useState<{ status: "ok" | "already"; name: string; locationVerified: boolean | null } | null>(null);

  const errorText = (code: string | null) =>
    (code && (c.errors as Record<string, string>)[code]) || c.errors.server_error;

  useEffect(() => {
    document.title = `${c.heading} | Church Management Pro`;
  }, [c.heading]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin?action=resolve", {
        body: { token },
      });
      if (fnError || data?.error) {
        setError(data?.error ?? "invalid_token");
      } else {
        setInfo(data as ResolveInfo);
      }
      setLoading(false);
    })();
  }, [token]);

  const getPosition = () =>
    new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  const submit = async (payload: { identifier?: string; memberQr?: string }) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const pos = await getPosition();
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin?action=checkin", {
        body: {
          token,
          ...payload,
          lat: pos?.coords.latitude ?? null,
          lng: pos?.coords.longitude ?? null,
        },
      });

      if (fnError || data?.error) {
        setError(data?.error ?? "server_error");
        return;
      }
      setResult({
        status: data.status,
        name: data.memberName ?? "",
        locationVerified: data.locationVerified ?? null,
      });
    } catch (err) {
      console.error(err);
      setError("server_error");
    } finally {
      setSubmitting(false);
      setCameraActive(false);
    }
  };

  const primary = info?.church?.primaryColor;

  return (
    <main className="min-h-screen bg-muted/30 flex items-start justify-center p-4">
      <div className="w-full max-w-md space-y-4 py-8">
        <header className="text-center space-y-2">
          {info?.church?.logoUrl && (
            <img
              src={info.church.logoUrl}
              alt={`${info.church.name} logo`}
              className="h-16 w-16 rounded-full object-cover mx-auto"
              loading="lazy"
            />
          )}
          <h1 className="text-2xl font-bold" style={primary ? { color: primary } : undefined}>
            {info?.church?.name ?? c.heading}
          </h1>
          {info?.event && (
            <p className="text-muted-foreground">
              {info.event.name}
              {info.event.location ? ` · ${info.event.location}` : ""}
            </p>
          )}
        </header>

        {loading ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground text-sm">{c.loading}</p>
            </CardContent>
          </Card>
        ) : result ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
              <p className="text-xl font-semibold">
                {c.welcome}, {result.name}
              </p>
              <p className="text-muted-foreground">
                {result.status === "already" ? c.already : c.checkedIn}
              </p>
              {result.locationVerified === false && (
                <p className="text-sm text-amber-600 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {c.locationUnverified}
                </p>
              )}
            </CardContent>
          </Card>
        ) : !info ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-muted-foreground">{errorText(error)}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="space-y-1">
                <h2 className="font-semibold">{c.identify}</h2>
                <p className="text-sm text-muted-foreground">{c.identifyHint}</p>
              </div>

              {scanMode ? (
                <div className="space-y-3">
                  <CameraScanner
                    isActive={cameraActive}
                    onActiveChange={setCameraActive}
                    onScan={(code) => submit({ memberQr: code })}
                  />
                  <Button variant="ghost" className="w-full" onClick={() => setScanMode(false)}>
                    {c.typeInstead}
                  </Button>
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (identifier.trim()) submit({ identifier: identifier.trim() });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="sr-only">
                      {c.placeholder}
                    </Label>
                    <Input
                      id="identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={c.placeholder}
                      autoComplete="off"
                      inputMode="text"
                      maxLength={60}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting || !identifier.trim()}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {c.locating}
                      </>
                    ) : (
                      c.submit
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setScanMode(true);
                      setCameraActive(true);
                    }}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {c.scanCard}
                  </Button>
                </form>
              )}

              {error && <p className="text-sm text-destructive text-center">{errorText(error)}</p>}

              {info.requireLocation && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {c.errors.location_required}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
