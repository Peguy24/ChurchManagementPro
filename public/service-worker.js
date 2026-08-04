/**
 * Kill-switch service worker.
 *
 * Older builds of this app registered a caching service worker at /sw.js.
 * Browsers that still have it installed keep serving stale HTML/JS, which is
 * why some phones never see new releases. Browsers re-fetch the worker script
 * periodically; this replacement clears the app's own caches, reloads open
 * tabs, and unregisters itself for good.
 */

function isAppWorkboxCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)workbox-/.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCaches = cacheNames.filter(isAppWorkboxCache);
        await Promise.allSettled(appCaches.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

// Never serve anything from cache while this worker is alive.
self.addEventListener("fetch", () => {});
