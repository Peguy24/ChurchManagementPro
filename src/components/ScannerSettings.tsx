import { useState, useEffect } from "react";
import { Volume2, VolumeX, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export interface ScannerSoundSettings {
  enabled: boolean;
  volume: number;
  successSound: string;
  errorSound: string;
}

const DEFAULT_SETTINGS: ScannerSoundSettings = {
  enabled: true,
  volume: 50,
  successSound: "/success-beep.mp3",
  errorSound: "/error-beep.mp3",
};

interface ScannerSettingsProps {
  onSettingsChange: (settings: ScannerSoundSettings) => void;
}

export default function ScannerSettings({ onSettingsChange }: ScannerSettingsProps) {
  const [settings, setSettings] = useState<ScannerSoundSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("scannerSoundSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      onSettingsChange(parsed);
    } else {
      onSettingsChange(DEFAULT_SETTINGS);
    }
  }, [onSettingsChange]);

  const updateSettings = (updates: Partial<ScannerSoundSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem("scannerSoundSettings", JSON.stringify(newSettings));
    onSettingsChange(newSettings);
  };

  const playTestSound = (type: "success" | "error") => {
    if (!settings.enabled) return;
    
    try {
      const audio = new Audio(type === "success" ? settings.successSound : settings.errorSound);
      audio.volume = settings.volume / 100;
      audio.play().catch(() => {});
    } catch (e) {
      console.error("Error playing test sound:", e);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {settings.enabled ? (
            <Volume2 className="h-4 w-4 mr-2" />
          ) : (
            <VolumeX className="h-4 w-4 mr-2" />
          )}
          Paramèt Son
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramèt Son Scanner
            </h4>
          </div>

          {/* Enable/Disable Sounds */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-enabled" className="cursor-pointer">
              Aktive Son
            </Label>
            <Switch
              id="sound-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volim: {settings.volume}%</Label>
            </div>
            <Slider
              value={[settings.volume]}
              onValueChange={([volume]) => updateSettings({ volume })}
              min={0}
              max={100}
              step={5}
              disabled={!settings.enabled}
              className="w-full"
            />
          </div>

          {/* Test Sounds */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm text-muted-foreground">Tès Son</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => playTestSound("success")}
                disabled={!settings.enabled}
                className="flex-1"
              >
                ✓ Son Siksè
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => playTestSound("error")}
                disabled={!settings.enabled}
                className="flex-1"
              >
                ✗ Son Erè
              </Button>
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            Son yo ap jwe lè w skane yon QR code. Ou ka ajiste volim oswa dezaktive son yo konplètman.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
