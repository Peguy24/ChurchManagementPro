import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CameraScannerProps {
  onScan: (qrCode: string) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
  className?: string;
}

export default function CameraScanner({ 
  onScan, 
  isActive, 
  onActiveChange,
  className = "" 
}: CameraScannerProps) {
  const { t } = useLanguage();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scannerReady, setScannerReady] = useState(false);

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (!scannerRef.current) {
          scannerRef.current = new Html5QrcodeScanner(
            "camera-scanner-container",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
              rememberLastUsedCamera: true,
              videoConstraints: {
                facingMode: { ideal: "environment" }
              }
            },
            false
          );

          scannerRef.current.render(
            (decodedText) => {
              onScan(decodedText);
            },
            (error) => {
              // Silently handle scan errors
            }
          );
          setScannerReady(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
        setScannerReady(false);
      }
    };
  }, [isActive, onScan]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const toggleScanner = () => {
    if (isActive) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
        setScannerReady(false);
      }
    }
    onActiveChange(!isActive);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant={isActive ? "destructive" : "default"}
          onClick={toggleScanner}
          className="gap-2"
        >
          {isActive ? (
            <>
              <CameraOff className="h-4 w-4" />
              {t("attendance.stopCamera") || "Arrêter la caméra"}
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {t("attendance.startCamera") || "Démarrer la caméra"}
            </>
          )}
        </Button>
      </div>

      {isActive && (
        <div 
          ref={containerRef}
          className="rounded-lg overflow-hidden border bg-muted"
        >
          <div id="camera-scanner-container" className="w-full" />
        </div>
      )}
    </div>
  );
}
