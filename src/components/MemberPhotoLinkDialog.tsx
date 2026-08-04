import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useLanguage, Language } from "@/contexts/LanguageContext";

const t: Record<Language, Record<string, string>> = {
  fr: {
    title: "Lien d'envoi de photo",
    desc: "Partagez ce lien avec le membre. Il expire dans 7 jours.",
    copy: "Copier",
    copied: "Copié",
    open: "Ouvrir",
    whatsapp: "Partager sur WhatsApp",
    scan: "Ou faites scanner ce QR code au membre.",
    msg: "Bonjour, envoyez votre photo pour votre carte de membre ici :",
  },
  en: {
    title: "Photo upload link",
    desc: "Share this link with the member. It expires in 7 days.",
    copy: "Copy",
    copied: "Copied",
    open: "Open",
    whatsapp: "Share on WhatsApp",
    scan: "Or let the member scan this QR code.",
    msg: "Hello, please send your membership card photo here:",
  },
  ht: {
    title: "Lyen pou voye foto",
    desc: "Pataje lyen sa a ak manm nan. Li ekspire nan 7 jou.",
    copy: "Kopye",
    copied: "Kopye",
    open: "Louvri",
    whatsapp: "Pataje sou WhatsApp",
    scan: "Oswa kite manm nan eskane QR code sa a.",
    msg: "Bonjou, voye foto pou kat manm ou an isit la:",
  },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  memberName?: string;
}

export default function MemberPhotoLinkDialog({
  open,
  onOpenChange,
  url,
  memberName,
}: Props) {
  const { language } = useLanguage();
  const lt = t[language] ?? t.en;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200, margin: 1 });
    }
  }, [open, url]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {lt.title}
            {memberName ? ` — ${memberName}` : ""}
          </DialogTitle>
          <DialogDescription>{lt.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input readOnly value={url ?? ""} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" size="icon" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" disabled={!url}>
              <a href={url ?? "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {lt.open}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={!url}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${lt.msg} ${url ?? ""}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {lt.whatsapp}
              </a>
            </Button>
          </div>

          <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
            <canvas ref={canvasRef} />
            <p className="text-center text-xs text-muted-foreground">{lt.scan}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
