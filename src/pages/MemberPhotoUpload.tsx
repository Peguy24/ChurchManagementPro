import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CameraCapture from "@/components/CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Camera, Check, Upload, Loader2 } from "lucide-react";

const localT: Record<Language, Record<string, string>> = {
  fr: {
    heading: "Photo de membre",
    intro: "Envoyez votre photo pour votre carte de membre.",
    take: "Prendre une photo",
    upload: "Choisir un fichier",
    send: "Envoyer la photo",
    sending: "Envoi...",
    done: "Merci ! Votre photo a été envoyée.",
    doneDesc: "Elle sera vérifiée par votre église avant d'apparaître sur votre carte.",
    invalid: "Ce lien n'est plus valide.",
    expired: "Ce lien a expiré. Demandez-en un nouveau à votre église.",
    loading: "Chargement...",
    tips: "Conseils : visage bien centré, bonne lumière, fond neutre.",
    failed: "L'envoi a échoué. Réessayez.",
  },
  en: {
    heading: "Member photo",
    intro: "Send your photo for your membership card.",
    take: "Take a photo",
    upload: "Choose a file",
    send: "Send photo",
    sending: "Sending...",
    done: "Thank you! Your photo was sent.",
    doneDesc: "Your church will review it before it appears on your card.",
    invalid: "This link is no longer valid.",
    expired: "This link has expired. Ask your church for a new one.",
    loading: "Loading...",
    tips: "Tips: center your face, good lighting, plain background.",
    failed: "Sending failed. Please try again.",
  },
  ht: {
    heading: "Foto manm",
    intro: "Voye foto ou pou kat manm ou.",
    take: "Pran yon foto",
    upload: "Chwazi yon fichye",
    send: "Voye foto a",
    sending: "Ap voye...",
    done: "Mèsi! Foto ou voye.",
    doneDesc: "Legliz ou ap verifye l anvan li parèt sou kat la.",
    invalid: "Lyen sa a pa valab ankò.",
    expired: "Lyen an ekspire. Mande legliz ou yon nouvo.",
    loading: "Ap chaje...",
    tips: "Konsèy: figi nan mitan, bon limyè, fon senp.",
    failed: "Voye a echwe. Eseye ankò.",
  },
};

interface Info {
  memberName: string;
  churchName: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

export default function MemberPhotoUpload() {
  const { token } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const lt = localT[language] ?? localT.en;

  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "expired" | "done">(
    "loading"
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.functions.invoke("member-photo-upload", {
        body: { action: "info", token },
      });
      if (error || !data || data.error) {
        setState(data?.error === "expired" ? "expired" : "invalid");
        return;
      }
      setInfo(data as Info);
      setState("ready");
    };
    load();
  }, [token]);

  const toDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const shrink = async (dataUrl: string) => {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = dataUrl;
    });
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(
      img,
      (img.naturalWidth - size) / 2,
      (img.naturalHeight - size) / 2,
      size,
      size,
      0,
      0,
      900,
      900
    );
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  const handleFile = async (file: File) => {
    setError(null);
    const raw = await toDataUrl(file);
    setPreview(await shrink(raw));
  };

  const send = async () => {
    if (!preview) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("member-photo-upload", {
      body: { action: "upload", token, image: preview },
    });
    setSending(false);
    if (error || !data || data.error) {
      setError(lt.failed);
      return;
    }
    setState("done");
  };

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-muted-foreground">
        {lt.loading}
      </main>
    );
  }

  if (state === "invalid" || state === "expired") {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <h1 className="text-lg font-semibold">{lt.heading}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {state === "expired" ? lt.expired : lt.invalid}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-6 text-center">
          {info?.logoUrl && (
            <img
              src={info.logoUrl}
              alt={info.churchName}
              className="mx-auto h-16 w-16 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-xl font-semibold">{info?.churchName || lt.heading}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {info?.memberName ? `${info.memberName} — ${lt.intro}` : lt.intro}
            </p>
          </div>

          {state === "done" ? (
            <div className="space-y-2 py-6">
              <Check className="mx-auto h-10 w-10 text-primary" />
              <p className="font-medium">{lt.done}</p>
              <p className="text-sm text-muted-foreground">{lt.doneDesc}</p>
            </div>
          ) : (
            <>
              <div className="mx-auto aspect-square w-48 overflow-hidden rounded-xl border bg-muted">
                {preview ? (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{lt.tips}</p>

              <div className="flex flex-col gap-2">
                <Button onClick={() => setCameraOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" />
                  {lt.take}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {lt.upload}
                </Button>
                <Button disabled={!preview || sending} onClick={send}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {sending ? lt.sending : lt.send}
                </Button>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <CameraCapture
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(file) => handleFile(file)}
      />
    </main>
  );
}
