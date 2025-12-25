import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera } from "lucide-react";
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
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const initializeScanner = (facing: "environment" | "user") => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }

    scannerRef.current = new Html5QrcodeScanner(
      "camera-scanner-container",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: false,
        videoConstraints: {
          facingMode: facing
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
  };

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeScanner(facingMode);
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
  }, [isActive]);

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

  const switchCamera = () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    
    if (isActive && scannerReady) {
      // Small delay to ensure clean switch
      setTimeout(() => {
        initializeScanner(newFacing);
      }, 100);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          type="button"
          variant={isActive ? "destructive" : "default"}
          onClick={toggleScanner}
          className="gap-2 flex-1 sm:flex-none"
        >
          {isActive ? (
            <>
              <CameraOff className="h-4 w-4" />
              <span className="hidden sm:inline">{t("attendance.stopCamera") || "Arrêter la caméra"}</span>
              <span className="sm:hidden">Stop</span>
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">{t("attendance.startCamera") || "Démarrer la caméra"}</span>
              <span className="sm:hidden">Caméra</span>
            </>
          )}
        </Button>

        {isActive && (
          <Button
            type="button"
            variant="outline"
            onClick={switchCamera}
            className="gap-2 flex-1 sm:flex-none"
          >
            <SwitchCamera className="h-4 w-4" />
            <span className="hidden sm:inline">
              {facingMode === "environment" 
                ? (t("attendance.switchToFront") || "Caméra avant") 
                : (t("attendance.switchToBack") || "Caméra arrière")}
            </span>
            <span className="sm:hidden">
              {facingMode === "environment" ? "Avant" : "Arrière"}
            </span>
          </Button>
        )}
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
