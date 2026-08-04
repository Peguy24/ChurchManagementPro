/**
 * Auto-refresh the app when a new build is deployed.
 *
 * The published site can be served from a browser/CDN cache, which is why a
 * manual hard refresh was needed to see new releases. We fetch index.html with
 * `no-store`, read the hashed bundle name, and reload once it changes.
 */

const CHECK_INTERVAL_MS = 30_000;
let currentBuildId: string | null = null;
let reloading = false;
let started = false;

function extractBuildId(html: string): string | null {
  const matches = Array.from(html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)).map(
    (m) => m[0],
  );
  if (!matches.length) return null;
  return matches.sort().join("|");
}

async function fetchBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return extractBuildId(await res.text());
  } catch {
    return null;
  }
}

async function checkForUpdate() {
  if (reloading || document.visibilityState === "hidden") return;
  const buildId = await fetchBuildId();
  if (!buildId) return;
  if (!currentBuildId) {
    currentBuildId = buildId;
    return;
  }
  if (buildId !== currentBuildId) {
    reloading = true;
    if ("caches" in window) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch {
        /* ignore */
      }
    }
    window.location.reload();
  }
}

export function startAutoUpdate() {
  if (started) return;
  // Only meaningful on built/deployed assets.
  if (import.meta.env.DEV) return;
  started = true;

  void checkForUpdate();
  window.setInterval(() => void checkForUpdate(), CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
  window.addEventListener("focus", () => void checkForUpdate());
}
