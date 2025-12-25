import { useState, useEffect } from "react";
import { Volume2, VolumeX, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { playSuccessSound, playErrorSound, playMemberAnnounceSound } from "@/lib/soundGenerator";

export interface ScannerSoundSettings {
  enabled: boolean;
  volume: number;
  successSound: string;
  errorSound: string;
  continuousMode: boolean;
  soundStyle: "classic" | "musical" | "ascending";
}

const DEFAULT_SETTINGS: ScannerSoundSettings = {
  enabled: true,
  volume: 50,
  successSound: "/success-beep.mp3",
  errorSound: "/error-beep.mp3",
  continuousMode: true,
  soundStyle: "musical",
};

interface ScannerSettingsProps {
  onSettingsChange: (settings: ScannerSoundSettings) => void;
}

export default function ScannerSettings({ onSettingsChange }: ScannerSettingsProps) {
  const [settings, setSettings] = useState<ScannerSoundSettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const [testIndex, setTestIndex] = useState(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("scannerSoundSettings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Merge with defaults for new properties
      const merged = { ...DEFAULT_SETTINGS, ...parsed };
      setSettings(merged);
      onSettingsChange(merged);
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
    
    const volume = settings.volume / 100;
    
    if (type === "success") {
      if (settings.soundStyle === "musical") {
        playSuccessSound(volume);
      } else if (settings.soundStyle === "ascending") {
        playMemberAnnounceSound(testIndex, volume);
        setTestIndex(prev => prev + 1);
      } else {
        // Classic file-based sound
        try {
          const audio = new Audio(settings.successSound);
          audio.volume = volume;
          audio.play().catch(() => {});
        } catch (e) {
          console.error("Error playing sound:", e);
        }
      }
    } else {
      if (settings.soundStyle === "classic") {
        try {
          const audio = new Audio(settings.errorSound);
          audio.volume = volume;
          audio.play().catch(() => {});
        } catch (e) {
          console.error("Error playing sound:", e);
        }
      } else {
        playErrorSound(volume);
      }
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
          Paramètres Son
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres du Scanner
            </h4>
          </div>

          {/* Enable/Disable Sounds */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-enabled" className="cursor-pointer">
              Activer le son
            </Label>
            <Switch
              id="sound-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          {/* Continuous Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="continuous-mode" className="cursor-pointer flex items-center gap-2">
                <RefreshCw className="h-3 w-3" />
                Mode continu
              </Label>
              <p className="text-xs text-muted-foreground">
                Scan automatique sans pause
              </p>
            </div>
            <Switch
              id="continuous-mode"
              checked={settings.continuousMode}
              onCheckedChange={(continuousMode) => updateSettings({ continuousMode })}
            />
          </div>

          {/* Sound Style */}
          <div className="space-y-2">
            <Label>Style de son</Label>
            <Select
              value={settings.soundStyle}
              onValueChange={(value: "classic" | "musical" | "ascending") => {
                updateSettings({ soundStyle: value });
                setTestIndex(0);
              }}
              disabled={!settings.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classique (fichiers audio)</SelectItem>
                <SelectItem value="musical">Musical (accords variés)</SelectItem>
                <SelectItem value="ascending">Ascendant (tonalité croissante)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.soundStyle === "musical" && "Sons d'accords différents à chaque scan"}
              {settings.soundStyle === "ascending" && "Tonalité qui monte avec chaque membre scanné"}
              {settings.soundStyle === "classic" && "Sons audio classiques (beep)"}
            </p>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Volume: {settings.volume}%</Label>
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
            <Label className="text-sm text-muted-foreground">Tester les sons</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => playTestSound("success")}
                disabled={!settings.enabled}
                className="flex-1"
              >
                ✓ Son Succès
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => playTestSound("error")}
                disabled={!settings.enabled}
                className="flex-1"
              >
                ✗ Son Erreur
              </Button>
            </div>
            {settings.soundStyle === "ascending" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTestIndex(0)}
                className="w-full text-xs"
              >
                Réinitialiser la séquence
              </Button>
            )}
          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground">
            Mode continu: le scanner reste actif entre chaque scan. Sons variés: chaque scan a une tonalité unique.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
