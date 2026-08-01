import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, SwitchCamera, Check } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const localT: Record<Language, Record<string, string>> = {
  fr: {
    title: "Prendre une photo",
    hint: "Centrez le visage dans l'ovale, bonne lumière, fond neutre.",
    capture: "Capturer",
    retake: "Reprendre",
    use: "Utiliser cette photo",
    cancel: "Annuler",
    switch: "Changer de caméra",
    denied: "Accès à la caméra refusé",
    deniedDesc:
      "Autorisez la caméra dans votre navigateur, puis réessayez. Vous pouvez aussi importer un fichier.",
    starting: "Démarrage de la caméra...",
  },
  en: {
    title: "Take a photo",
    hint: "Center the face in the oval, good light, plain background.",
    capture: "Capture",
    retake: "Retake",
    use: "Use this photo",
    cancel: "Cancel",
    switch: "Switch camera",
    denied: "Camera access denied",
    deniedDesc:
      "Allow camera access in your browser and try again. You can also upload a file instead.",
    starting: "Starting camera...",
  },
  ht: {
    title: "Pran yon foto",
    hint: "Mete figi a nan mitan oval la, bon limyè, fon senp.",
    capture: "Pran foto",
    retake: "Reprann",
    use: "Itilize foto sa a",
    cancel: "Anile",
    switch: "Chanje kamera",
    denied: "Aksè kamera refize",
    deniedDesc:
      "Otorize kamera a nan navigatè w la epi eseye ankò. Ou ka telechaje yon fichye tou.",
    starting: "Kamera ap demare...",
  },
};

interface CameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives a square JPEG file ready for cropping/upload */
  onCapture: (file: File) => void;
  title?: string;
}

const OUTPUT_SIZE = 900;

export default function CameraCapture({
  open,
  onOpenChange,
  onCapture,
  title,
}: CameraCaptureProps) {
  const { language } = useLanguage();
  const lt = localT[language] ?? localT.en;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setReady(true);
    } catch {
      setError(true);
    }
  }, [facing, stop]);

  useEffect(() => {
    if (open && !shot) {
      start();
    }
    if (!open) {
      stop();
      setShot(null);
    }
    return () => {
      if (!open) stop();
    };
  }, [open, facing, shot, start, stop]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    if (facing === "user") {
      ctx.translate(OUTPUT_SIZE, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    setShot(canvas.toDataURL("image/jpeg", 0.92));
    stop();
  };

  const confirm = async () => {
    if (!shot) return;
    const blob = await (await fetch(shot)).blob();
    const file = new File([blob], `photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    onCapture(file);
    setShot(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title || lt.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-xl border bg-muted">
            {shot ? (
              <img src={shot} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${
                    facing === "user" ? "scale-x-[-1]" : ""
                  }`}
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-x-[18%] inset-y-[8%] rounded-[50%] border-2 border-dashed border-background/70" />
                </div>
                {!ready && !error && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    {lt.starting}
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <p className="text-sm font-medium">{lt.denied}</p>
                    <p className="text-xs text-muted-foreground">
                      {lt.deniedDesc}
                    </p>
                    <Button size="sm" variant="outline" onClick={start}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {lt.retake}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">{lt.hint}</p>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {shot ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShot(null)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {lt.retake}
              </Button>
              <Button type="button" onClick={confirm}>
                <Check className="mr-2 h-4 w-4" />
                {lt.use}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={lt.switch}
                onClick={() =>
                  setFacing((f) => (f === "user" ? "environment" : "user"))
                }
              >
                <SwitchCamera className="h-4 w-4" />
              </Button>
              <Button type="button" onClick={capture} disabled={!ready}>
                <Camera className="mr-2 h-4 w-4" />
                {lt.capture}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
