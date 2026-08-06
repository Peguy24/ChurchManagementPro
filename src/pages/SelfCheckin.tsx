import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CameraScanner from "@/components/CameraScanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { previewIdentifier, sanitizeIdentifier } from "@/lib/checkinIdentifier";
import { CheckCircle2, Loader2, MapPin, Phone, QrCode, IdCard, XCircle, AlertTriangle } from "lucide-react";


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
    matchAs: "Will be matched as",
    asMemberNumber: "Member number",
    asPhone: "Phone number",
    tooShort: "Too short — enter a full phone number or your member number.",
    unrecognized: "Unrecognized format — use digits only, or a number like MBR00023.",
    locationUnverified: "We couldn't verify your location, but your attendance was recorded.",

    allow: "Allow location",
    allowHint: "This event requires location to confirm you're at the church.",
    granted: "Location enabled",
    unavailable: "Location is allowed, but your phone could not determine your position. Turn on Precise Location and your phone's Location Services, then try again.",
    denied: "Location is blocked. Open your browser settings for this site and set Location to \"Allow\", then reload this page.",
    unsupported: "Your browser doesn't support location. Please see a greeter.",
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
    matchAs: "Sera reconnu comme",
    asMemberNumber: "Numéro de membre",
    asPhone: "Numéro de téléphone",
    tooShort: "Trop court — entrez un numéro de téléphone complet ou votre numéro de membre.",
    unrecognized: "Format non reconnu — utilisez des chiffres, ou un numéro comme MBR00023.",
    locationUnverified: "Position non vérifiée, mais votre présence a été enregistrée.",
    allow: "Autoriser la localisation",
    allowHint: "Cet \u00e9v\u00e9nement exige la localisation pour confirmer que vous \u00eates \u00e0 l'\u00e9glise.",
    granted: "Localisation activ\u00e9e",
    unavailable: "La localisation est autoris\u00e9e, mais votre t\u00e9l\u00e9phone ne trouve pas votre position. Activez Localisation pr\u00e9cise et les services de localisation, puis r\u00e9essayez.",
    denied: "La localisation est bloqu\u00e9e. Ouvrez les r\u00e9glages du navigateur pour ce site et mettez Localisation sur \u00ab Autoriser \u00bb, puis rechargez la page.",
    unsupported: "Votre navigateur ne prend pas en charge la localisation. Voyez un accueillant.",
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
    matchAs: "N ap chèche l kòm",
    asMemberNumber: "Nimewo manm",
    asPhone: "Nimewo telefòn",
    tooShort: "Twò kout — antre yon nimewo telefòn konplè oswa nimewo manm ou.",
    unrecognized: "Fòma nou pa rekonèt — sèvi ak chif, oswa yon nimewo tankou MBR00023.",
    locationUnverified: "Nou pa t ka verifye kote w ye, men prezans ou anrejistre.",
    allow: "Bay p\u00e8misyon lokalizasyon",
    allowHint: "Ev\u00e8nman sa a mande lokalizasyon pou konfime ou nan legliz la.",
    granted: "Lokalizasyon aktive",
    unavailable: "Lokalizasyon otorize, men telef\u00f2n ou pa jwenn pozisyon ou. Aktive Precise Location ak s\u00e8vis lokalizasyon telef\u00f2n nan, epi eseye ank\u00f2.",
    denied: "Lokalizasyon bloke. Ale nan param\u00e8t navigat\u00e8 a pou sit sa a, mete Lokalizasyon sou \u00ab Allow \u00bb, epi rechaje paj la.",
    unsupported: "Navigat\u00e8 ou pa sip\u00f2te lokalizasyon. W\u00e8 yon akeyan.",
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
  const [locStatus, setLocStatus] = useState<"unknown" | "granted" | "denied" | "unavailable" | "unsupported">("unknown");
  const [locRequesting, setLocRequesting] = useState(false);
  const [verifiedPosition, setVerifiedPosition] = useState<GeolocationPosition | null>(null);
  const locationDeniedRef = useRef(false);

  const preview = useMemo(() => previewIdentifier(identifier), [identifier]);
  const canSubmit = preview.kind === "member_number" || preview.kind === "phone";



  const errorText = (code: string | null) =>
    (code && (c.errors as Record<string, string>)[code]) || c.errors.server_error;

  useEffect(() => {
    document.title = `${c.heading} | Church Management Pro`;
  }, [c.heading]);

  // supabase.functions.invoke throws on non-2xx and hides the JSON body,
  // so read the real error code from the response.
  const readErrorCode = async (fnError: unknown): Promise<string | null> => {
    const ctx = (fnError as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.clone().json();
        if (body?.error) return String(body.error);
      } catch { /* noop */ }
    }
    return null;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    perms?.query?.({ name: "geolocation" as PermissionName })
      .then((res) => {
        // Permission alone does not mean the device has returned coordinates.
        // Keep the action visible until getCurrentPosition succeeds.
        if (res.state === "granted") setLocStatus("unknown");
        if (res.state === "denied") setLocStatus("denied");
        res.onchange = () => {
          if (res.state === "granted") setLocStatus(verifiedPosition ? "granted" : "unknown");
          else if (res.state === "denied") {
            locationDeniedRef.current = true;
            setLocStatus("denied");
          }
          else setLocStatus("unknown");
        };
      })
      .catch(() => undefined);
  }, [verifiedPosition]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data, error: fnError } = await supabase.functions.invoke("self-checkin?action=resolve", {
        body: { token },
      });
      if (fnError || data?.error) {
        setError((await readErrorCode(fnError)) ?? data?.error ?? "invalid_token");
      } else {
        setInfo(data as ResolveInfo);
      }
      setLoading(false);
    })();
  }, [token]);

  const requestPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            locationDeniedRef.current = true;
            setLocStatus("denied");
          }
          resolve(null);
        },
        options,
      );
    });

  const getPosition = async () => {
    if (verifiedPosition) return verifiedPosition;
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return null;
    }

    // A cached or network-assisted fix is much more reliable indoors and on iOS.
    locationDeniedRef.current = false;
    let position = await requestPosition({
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 5 * 60 * 1000,
    });
    if (!position && !locationDeniedRef.current) {
      position = await requestPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 60 * 1000,
      });
    }

    if (position) {
      setVerifiedPosition(position);
      setLocStatus("granted");
    } else if (!locationDeniedRef.current) {
      setLocStatus("unavailable");
    }
    return position;
  };

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocStatus("unsupported");
      return;
    }
    setLocRequesting(true);
    setError(null);
    await getPosition();
    setLocRequesting(false);
  };

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
        setError((await readErrorCode(fnError)) ?? data?.error ?? "server_error");
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
                    if (canSubmit) submit({ identifier: identifier.trim() });
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="sr-only">
                      {c.placeholder}
                    </Label>
                    <Input
                      id="identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(sanitizeIdentifier(e.target.value))}
                      placeholder={c.placeholder}
                      autoComplete="off"
                      inputMode="text"
                      maxLength={40}
                      aria-invalid={preview.kind === "invalid"}
                      aria-describedby="identifier-preview"
                    />
                    <div id="identifier-preview" aria-live="polite" className="min-h-[1.25rem]">
                      {preview.kind === "member_number" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <IdCard className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {c.matchAs}: {c.asMemberNumber}{" "}
                            <span className="font-medium text-foreground">{preview.normalized}</span>
                          </span>
                        </p>
                      )}
                      {preview.kind === "phone" && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {c.matchAs}: {c.asPhone}{" "}
                            <span className="font-medium text-foreground">{preview.normalized}</span>
                          </span>
                        </p>
                      )}
                      {preview.kind === "invalid" && (
                        <p role="alert" className="text-xs text-destructive flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{preview.reason === "too_short" ? c.tooShort : c.unrecognized}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting || !canSubmit}>

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
                <div className="space-y-2 rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {locStatus === "granted" ? c.granted : c.allowHint}
                  </p>
                  {locStatus === "denied" && (
                    <p className="text-xs text-destructive">{c.denied}</p>
                  )}
                  {locStatus === "unsupported" && (
                    <p className="text-xs text-destructive">{c.unsupported}</p>
                  )}
                   {locStatus === "unavailable" && (
                     <p className="text-xs text-destructive">{c.unavailable}</p>
                   )}
                  {locStatus !== "granted" && locStatus !== "unsupported" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={requestLocation}
                      disabled={locRequesting}
                    >
                      {locRequesting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4 mr-2" />
                      )}
                      {c.allow}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
