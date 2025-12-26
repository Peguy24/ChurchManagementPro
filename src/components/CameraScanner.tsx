import { useState, useEffect, useRef, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, SwitchCamera, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type ScanFeedbackStatus = 'success' | 'duplicate' | 'error' | null;

interface CameraScannerProps {
  onScan: (qrCode: string) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
  className?: string;
  feedbackStatus?: ScanFeedbackStatus;
  feedbackMessage?: string;
}

// Audio context for mobile compatibility
let audioContext: AudioContext | null = null;

const getAudioContext = async (): Promise<AudioContext> => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Always try to resume on mobile (required for each interaction)
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
      console.log("Audio context resumed successfully");
    } catch (e) {
      console.error("Failed to resume audio context:", e);
    }
  }
  return audioContext;
};

// Vibrate device if supported (fallback for mobile)
const vibrateDevice = (pattern: number | number[] = 100): void => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      console.log("Device vibrated");
    }
  } catch (e) {
    console.error("Vibration not supported:", e);
  }
};

const playScanBeep = async (volume: number = 0.5): Promise<void> => {
  // Always vibrate as immediate feedback (works reliably on mobile)
  vibrateDevice([50, 30, 50]); // Short vibration pattern
  
  try {
    const ctx = await getAudioContext();
    const now = ctx.currentTime;
    
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = volume * 0.5; // Slightly louder
    
    // Create a pleasant "beep" sound
    const frequencies = [880, 1108.73]; // A5 + C#6 - major third
    
    frequencies.forEach((freq) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      // Quick attack, short sustain, fast decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(1, now + 0.02);
      gainNode.gain.setValueAtTime(1, now + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    });
    
    console.log("Scan beep played");
  } catch (e) {
    console.error("Error playing scan beep:", e);
  }
};

export default function CameraScanner({ 
  onScan, 
  isActive, 
  onActiveChange,
  className = "",
  feedbackStatus,
  feedbackMessage
}: CameraScannerProps) {
  const { t } = useLanguage();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [showFlash, setShowFlash] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string>("");
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use ref for onScan to avoid stale closure issues
  const onScanRef = useRef(onScan);
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const processingRef = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Initialize audio context on first user interaction
  const initializeAudio = useCallback(async () => {
    if (!audioInitialized) {
      try {
        const ctx = await getAudioContext();
        // Create and immediately stop a silent oscillator to unlock audio
        const oscillator = ctx.createOscillator();
        oscillator.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.001);
        setAudioInitialized(true);
        console.log("Audio context initialized for mobile");
      } catch (e) {
        console.error("Failed to initialize audio:", e);
      }
    }
  }, [audioInitialized]);

  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    const trimmedCode = decodedText.trim();
    
    // Prevent concurrent processing
    if (processingRef.current) {
      console.log("Camera scan blocked - already processing");
      return;
    }
    
    // Debounce: prevent same code being scanned within 5 seconds
    if (trimmedCode === lastScannedRef.current && now - lastScanTimeRef.current < 5000) {
      console.log("Camera scan debounced:", trimmedCode);
      return;
    }
    
    // Lock processing
    processingRef.current = true;
    setIsProcessing(true);
    
    console.log("Camera scanned QR code:", trimmedCode);
    lastScannedRef.current = trimmedCode;
    lastScanTimeRef.current = now;
    
    // Play immediate beep sound for camera scan
    playScanBeep(0.6);
    
    // Show flash animation
    setShowFlash(true);
    setLastScannedCode(trimmedCode);
    
    // Call the callback using the ref to ensure we have the latest function
    if (onScanRef.current) {
      onScanRef.current(trimmedCode);
    }
    
    // Release processing lock after animation and cooldown
    setTimeout(() => {
      setShowFlash(false);
      processingRef.current = false;
      setIsProcessing(false);
    }, 1500); // 1.5 second cooldown before next scan is allowed
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
    // Initialize audio on first button click (required for mobile)
    initializeAudio();
    
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
            <div className={`absolute inset-0 flex items-center justify-center animate-[pulse_0.3s_ease-out] pointer-events-none z-50 ${
              feedbackStatus === 'duplicate' ? 'bg-orange-500/40' :
              feedbackStatus === 'error' ? 'bg-red-500/40' :
              'bg-green-500/40'
            }`}>
              <div className={`rounded-full p-4 animate-scale-in shadow-lg ${
                feedbackStatus === 'duplicate' ? 'bg-orange-500' :
                feedbackStatus === 'error' ? 'bg-red-500' :
                'bg-green-500'
              }`}>
                {feedbackStatus === 'duplicate' ? (
                  <AlertCircle className="h-16 w-16 text-white" />
                ) : feedbackStatus === 'error' ? (
                  <XCircle className="h-16 w-16 text-white" />
                ) : (
                  <CheckCircle className="h-16 w-16 text-white" />
                )}
              </div>
            </div>
          )}
          
          {/* Feedback message overlay */}
          {showFlash && feedbackMessage && (
            <div className={`absolute bottom-0 left-0 right-0 p-3 text-center text-white font-bold text-lg z-50 ${
              feedbackStatus === 'duplicate' ? 'bg-orange-500' :
              feedbackStatus === 'error' ? 'bg-red-500' :
              'bg-green-500'
            }`}>
              {feedbackMessage}
            </div>
          )}
        </div>
      )}
      
      {/* Last scanned code indicator */}
      {lastScannedCode && isActive && (
        <div className={`text-center py-2 px-4 rounded-lg transition-all duration-300 ${
          showFlash && feedbackStatus === 'duplicate' ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-500' :
          showFlash && feedbackStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 border border-red-500' :
          showFlash ? 'bg-green-100 dark:bg-green-900/30 border border-green-500' : 
          'bg-muted'
        }`}>
          <p className="text-sm text-muted-foreground">
            {t("attendance.lastScan") || "Dernier scan"}:
          </p>
          <p className={`font-mono font-bold ${
            showFlash && feedbackStatus === 'duplicate' ? 'text-orange-600 dark:text-orange-400' :
            showFlash && feedbackStatus === 'error' ? 'text-red-600 dark:text-red-400' :
            showFlash ? 'text-green-600 dark:text-green-400' : 
            ''
          }`}>
            {lastScannedCode}
          </p>
        </div>
      )}
    </div>
  );
}
