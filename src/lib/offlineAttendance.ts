import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "cmp-offline";
const DB_VERSION = 1;
const QUEUE_STORE = "attendance_queue";
const MEMBER_STORE = "members_cache";

export interface QueuedAttendance {
  id: string;
  tenant_id: string;
  member_id: string;
  member_name: string;
  event_id: string | null;
  event_type: string;
  event_date: string;
  scan_method: string;
  marked_by: string | null;
  marked_at: string;
  created_at: number;
  attempts: number;
  last_error?: string;
}

export interface CachedMember {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  qr_code: string | null;
  member_number: string | null;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(MEMBER_STORE)) {
          const store = db.createObjectStore(MEMBER_STORE, { keyPath: "id" });
          store.createIndex("tenant_id", "tenant_id");
        }
      },
    });
  }
  return dbPromise;
}

/* ---------------- Member roster cache ---------------- */

export async function cacheMembers(tenantId: string): Promise<number> {
  const { data, error } = await supabase
    .from("members")
    .select("id, first_name, last_name, photo_url, qr_code, member_number")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error || !data) return 0;

  const db = await getDb();
  const tx = db.transaction(MEMBER_STORE, "readwrite");
  // Clear previous roster for this tenant to avoid stale members
  const existing = await tx.store.index("tenant_id").getAllKeys(tenantId);
  await Promise.all(existing.map((key) => tx.store.delete(key)));
  await Promise.all(
    data.map((m) =>
      tx.store.put({
        id: m.id,
        tenant_id: tenantId,
        first_name: m.first_name,
        last_name: m.last_name,
        photo_url: m.photo_url ?? null,
        qr_code: m.qr_code ?? null,
        member_number: m.member_number ?? null,
      } satisfies CachedMember),
    ),
  );
  await tx.done;
  return data.length;
}

export async function getCachedMemberCount(tenantId: string): Promise<number> {
  const db = await getDb();
  const keys = await db.getAllKeysFromIndex(MEMBER_STORE, "tenant_id", tenantId);
  return keys.length;
}

export async function findCachedMember(
  tenantId: string,
  code: string,
): Promise<CachedMember | null> {
  const db = await getDb();
  const all: CachedMember[] = await db.getAllFromIndex(MEMBER_STORE, "tenant_id", tenantId);
  const needle = code.trim().toLowerCase();
  return (
    all.find((m) => (m.qr_code || "").toLowerCase() === needle) ||
    all.find((m) => (m.member_number || "").toLowerCase() === needle) ||
    all.find(
      (m) =>
        (m.qr_code || "").toLowerCase().includes(needle) ||
        (m.member_number || "").toLowerCase().includes(needle),
    ) ||
    null
  );
}

/* ---------------- Attendance queue ---------------- */

export async function queueAttendance(
  record: Omit<QueuedAttendance, "id" | "created_at" | "attempts">,
): Promise<QueuedAttendance | "duplicate"> {
  const db = await getDb();
  const pending: QueuedAttendance[] = await db.getAll(QUEUE_STORE);
  const dup = pending.some(
    (p) =>
      p.member_id === record.member_id &&
      p.event_date === record.event_date &&
      (p.event_id || null) === (record.event_id || null),
  );
  if (dup) return "duplicate";

  const entry: QueuedAttendance = {
    ...record,
    id: `${record.member_id}-${record.event_date}-${record.event_id || "none"}`,
    created_at: Date.now(),
    attempts: 0,
  };
  await db.put(QUEUE_STORE, entry);
  notifyQueueChange();
  return entry;
}

export async function getQueuedAttendance(): Promise<QueuedAttendance[]> {
  const db = await getDb();
  const all: QueuedAttendance[] = await db.getAll(QUEUE_STORE);
  return all.sort((a, b) => a.created_at - b.created_at);
}

export async function removeQueued(id: string) {
  const db = await getDb();
  await db.delete(QUEUE_STORE, id);
  notifyQueueChange();
}

export async function clearQueue() {
  const db = await getDb();
  await db.clear(QUEUE_STORE);
  notifyQueueChange();
}

export interface SyncResult {
  synced: number;
  duplicates: number;
  failed: number;
}

let syncing = false;

export async function syncQueuedAttendance(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, duplicates: 0, failed: 0 };
  if (syncing || !navigator.onLine) return result;
  syncing = true;

  try {
    const db = await getDb();
    const pending = await getQueuedAttendance();

    for (const item of pending) {
      const { error } = await supabase.from("attendance_records").insert({
        member_id: item.member_id,
        event_date: item.event_date,
        event_type: item.event_type,
        event_id: item.event_id,
        scan_method: item.scan_method,
        tenant_id: item.tenant_id,
        marked_by: item.marked_by,
        marked_at: item.marked_at,
      });

      if (!error) {
        await db.delete(QUEUE_STORE, item.id);
        result.synced += 1;
      } else if (error.code === "23505") {
        // Already recorded server-side — safe to drop
        await db.delete(QUEUE_STORE, item.id);
        result.duplicates += 1;
      } else {
        await db.put(QUEUE_STORE, {
          ...item,
          attempts: item.attempts + 1,
          last_error: error.message,
        });
        result.failed += 1;
      }
    }
  } finally {
    syncing = false;
    notifyQueueChange();
  }

  return result;
}

/* ---------------- Change notification ---------------- */

const QUEUE_EVENT = "cmp-attendance-queue-changed";

function notifyQueueChange() {
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
}

export function onQueueChange(handler: () => void) {
  window.addEventListener(QUEUE_EVENT, handler);
  return () => window.removeEventListener(QUEUE_EVENT, handler);
}

export async function getCachedMemberById(id: string): Promise<CachedMember | null> {
  const db = await getDb();
  return (await db.get(MEMBER_STORE, id)) ?? null;
}
