import { useCallback, useEffect, useState } from "react";
import {
  cacheMembers,
  getCachedMemberCount,
  getQueuedAttendance,
  onQueueChange,
  syncQueuedAttendance,
  type SyncResult,
} from "@/lib/offlineAttendance";

export function useOfflineAttendance(tenantId: string | null) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedMembers, setCachedMembers] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCounts = useCallback(async () => {
    const queue = await getQueuedAttendance();
    setPendingCount(queue.length);
    if (tenantId) setCachedMembers(await getCachedMemberCount(tenantId));
  }, [tenantId]);

  const sync = useCallback(async (): Promise<SyncResult> => {
    setSyncing(true);
    try {
      const res = await syncQueuedAttendance();
      await refreshCounts();
      return res;
    } finally {
      setSyncing(false);
    }
  }, [refreshCounts]);

  // Keep the member roster cached for offline lookups
  useEffect(() => {
    if (!tenantId || !navigator.onLine) return;
    cacheMembers(tenantId).then(() => refreshCounts());
  }, [tenantId, refreshCounts]);

  useEffect(() => {
    refreshCounts();
    return onQueueChange(refreshCounts);
  }, [refreshCounts]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      sync();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [sync]);

  // Retry periodically while records are waiting
  useEffect(() => {
    if (pendingCount === 0) return;
    const id = window.setInterval(() => {
      if (navigator.onLine) sync();
    }, 30000);
    return () => window.clearInterval(id);
  }, [pendingCount, sync]);

  return { isOnline, pendingCount, cachedMembers, syncing, sync, refreshCounts };
}
