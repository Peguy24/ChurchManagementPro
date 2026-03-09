/**
 * Determines arrival status (early, on-time, late) by comparing
 * scan time (marked_at) against event start time (event_time).
 *
 * - Early: arrived > 5 min before event start
 * - On time: arrived within 5 min before to 15 min after event start
 * - Late: arrived > 15 min after event start
 */

export type ArrivalStatus = "early" | "onTime" | "late" | null;

export function getArrivalStatus(
  markedAt: string | null | undefined,
  eventTime: string | null | undefined
): ArrivalStatus {
  if (!markedAt || !eventTime) return null;

  try {
    const scanDate = new Date(markedAt);
    const [h, m] = eventTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;

    // Build event start on the same day as the scan
    const eventStart = new Date(scanDate);
    eventStart.setHours(h, m, 0, 0);

    const diffMs = scanDate.getTime() - eventStart.getTime();
    const diffMin = diffMs / 60000;

    if (diffMin < -5) return "early";
    if (diffMin > 15) return "late";
    return "onTime";
  } catch {
    return null;
  }
}

export function formatScanTime(markedAt: string | null | undefined): string {
  if (!markedAt) return "";
  try {
    const d = new Date(markedAt);
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

export function getStatusTranslationKey(status: ArrivalStatus): string {
  switch (status) {
    case "early": return "attendance.early";
    case "onTime": return "attendance.onTime";
    case "late": return "attendance.late";
    default: return "";
  }
}

export function getStatusColor(status: ArrivalStatus): string {
  switch (status) {
    case "early": return "text-green-600 dark:text-green-400";
    case "onTime": return "text-blue-600 dark:text-blue-400";
    case "late": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

export function getStatusBadgeVariant(status: ArrivalStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "early": return "default";
    case "onTime": return "secondary";
    case "late": return "destructive";
    default: return "outline";
  }
}
