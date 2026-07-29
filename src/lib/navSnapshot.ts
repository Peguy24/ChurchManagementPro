export interface NavSnapshotItem {
  to: string;
  label: string;
}

export interface NavSnapshotGroup {
  key: string;
  label: string;
  items: NavSnapshotItem[];
}

export interface NavSnapshot {
  userId: string | null;
  mode: "tenant" | "platform";
  brandingName: string;
  brandingSubtitle: string;
  brandingLogo: string;
  groups: NavSnapshotGroup[];
  openGroups: string[];
}

const KEY = "app_shell_snapshot";

export function saveNavSnapshot(snapshot: NavSnapshot) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* storage unavailable */
  }
}

export function loadNavSnapshot(): NavSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavSnapshot;
    if (!parsed || !Array.isArray(parsed.groups)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearNavSnapshot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
