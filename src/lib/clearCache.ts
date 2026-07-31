/**
 * Clear PWA cached assets without deleting auth tokens or church data.
 * Useful when the installed app shows an old UI on iOS or Android.
 */

export interface ClearCacheResult {
  serviceWorkers: number;
  caches: number;
}

export async function clearCachedAssets(): Promise<ClearCacheResult> {
  let serviceWorkers = 0;
  let cachesCleared = 0;

  // Unregister every service worker so the next load fetches fresh code.
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.unregister();
            serviceWorkers += 1;
          } catch {
            // ignore individual unregister failures
          }
        }),
      );
    } catch {
      // ignore
    }
  }

  // Delete all Cache Storage entries (HTML, JS, CSS, image caches).
  if ("caches" in window) {
    try {
      const names = await caches.keys();
      await Promise.all(
        names.map(async (name) => {
          try {
            await caches.delete(name);
            cachesCleared += 1;
          } catch {
            // ignore individual cache delete failures
          }
        }),
      );
    } catch {
      // ignore
    }
  }

  // Clear session-only snapshots (tenant color, navigation state, etc.).
  // Keep localStorage intact so the user stays logged in.
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  return { serviceWorkers, caches: cachesCleared };
}
