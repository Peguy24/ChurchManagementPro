import { useState, useEffect, useRef, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera, CheckCircle } from "lucide-react";
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
  const [showFlash, setShowFlash] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  
  // Use ref for onScan to avoid stale closure issues
  const onScanRef = useRef(onScan);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  // Keep the ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    const trimmedCode = decodedText.trim();
    
    // Debounce: prevent same code being scanned within 3 seconds
    if (trimmedCode === lastScannedRef.current && now - lastScanTimeRef.current < 3000) {
      console.log("Camera scan debounced:", trimmedCode);
      return;
    }
    
    console.log("Camera scanned QR code:", trimmedCode);
    lastScannedRef.current = trimmedCode;
    lastScanTimeRef.current = now;
    
    // Show flash animation
    setShowFlash(true);
    setLastScannedCode(trimmedCode);
    setTimeout(() => setShowFlash(false), 600);
    
    // Call the callback using the ref to ensure we have the latest function
    if (onScanRef.current) {
      onScanRef.current(trimmedCode);
    }
  }, []);

  const initializeScanner = useCallback((facing: "environment" | "user") => {
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
        handleScan(decodedText);
      },
      (error) => {
        // Silently handle scan errors (common when no QR code in view)
      }
    );
    setScannerReady(true);
  }, [handleScan]);

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
  }, [isActive, initializeScanner]);

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
          className="rounded-lg overflow-hidden border bg-muted relative"
        >
          <div id="camera-scanner-container" className="w-full" />
          
          {/* Flash overlay when QR code is detected */}
          {showFlash && (
            <div className="absolute inset-0 bg-green-500/40 flex items-center justify-center animate-[pulse_0.3s_ease-out] pointer-events-none z-50">
              <div className="bg-green-500 rounded-full p-4 animate-scale-in shadow-lg">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Last scanned code indicator */}
      {lastScannedCode && isActive && (
        <div className={`text-center py-2 px-4 rounded-lg transition-all duration-300 ${
          showFlash ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 'bg-muted'
        }`}>
          <p className="text-sm text-muted-foreground">
            {t("attendance.lastScan") || "Dernier scan"}:
          </p>
          <p className={`font-mono font-bold ${showFlash ? 'text-green-600 dark:text-green-400' : ''}`}>
            {lastScannedCode}
          </p>
        </div>
      )}
    </div>
  );
}
