import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check, QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface EventQRCodeProps {
  eventId: string;
}

export default function EventQRCode({ eventId }: EventQRCodeProps) {
  const { t } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const publishedOrigin = "https://cogmpw-sys.lovable.app";
  const registrationUrl = `${publishedOrigin}/event/${eventId}/register`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, registrationUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [registrationUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(registrationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="pt-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <QrCode className="h-4 w-4" />
            {t("eventRegistration.qrCode")}
          </div>
          <canvas ref={canvasRef} className="rounded" />
        </div>
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <p className="text-sm font-medium">{t("eventRegistration.registrationLink")}</p>
          <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">{registrationUrl}</p>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? t("eventRegistration.linkCopied") : t("eventRegistration.copyLink")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
