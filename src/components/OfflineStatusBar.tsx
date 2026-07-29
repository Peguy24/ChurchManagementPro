import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloudOff, Cloud, RefreshCw, WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const COPY = {
  en: {
    offline: "Offline mode",
    online: "Online",
    pending: "{n} waiting to sync",
    sync: "Sync now",
    ready: "{n} members available offline",
    savedLocally: "Saved on this device — will sync automatically",
  },
  fr: {
    offline: "Mode hors ligne",
    online: "En ligne",
    pending: "{n} en attente de synchronisation",
    sync: "Synchroniser",
    ready: "{n} membres disponibles hors ligne",
    savedLocally: "Enregistré sur cet appareil — synchronisation automatique",
  },
  ht: {
    offline: "Mòd san entènèt",
    online: "Sou entènèt",
    pending: "{n} k ap tann senkronizasyon",
    sync: "Senkronize kounye a",
    ready: "{n} manm disponib san entènèt",
    savedLocally: "Anrejistre sou aparèy sa a — l ap senkronize otomatikman",
  },
} as const;

interface Props {
  isOnline: boolean;
  pendingCount: number;
  cachedMembers: number;
  syncing: boolean;
  onSync: () => void;
  className?: string;
  compact?: boolean;
}

export default function OfflineStatusBar({
  isOnline,
  pendingCount,
  cachedMembers,
  syncing,
  onSync,
  className,
  compact,
}: Props) {
  const { language } = useLanguage();
  const copy = COPY[language as keyof typeof COPY] ?? COPY.en;

  if (isOnline && pendingCount === 0 && compact) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge
        variant={isOnline ? "secondary" : "destructive"}
        className="flex items-center gap-1.5"
      >
        {isOnline ? <Cloud className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {isOnline ? copy.online : copy.offline}
      </Badge>

      {pendingCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1.5">
          <CloudOff className="h-3.5 w-3.5" />
          {copy.pending.replace("{n}", String(pendingCount))}
        </Badge>
      )}

      {pendingCount > 0 && isOnline && (
        <Button size="sm" variant="outline" onClick={onSync} disabled={syncing}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", syncing && "animate-spin")} />
          {copy.sync}
        </Button>
      )}

      {!compact && !isOnline && cachedMembers > 0 && (
        <span className="text-xs text-muted-foreground">
          {copy.ready.replace("{n}", String(cachedMembers))}
        </span>
      )}
    </div>
  );
}
