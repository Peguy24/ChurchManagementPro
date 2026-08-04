/**
 * Single guarded service-worker registration wrapper.
 * Never registers in dev, iframes, or Lovable preview contexts.
 */

async function unregisterAppWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map((r) => r.unregister()),
  );
}

export async function registerOfflineSupport() {
  // This is a continuously updated business app, so fresh releases are more
  // important than offline caching. Remove legacy workers and their cached
  // HTML/chunks without touching authentication or local app data.
  await unregisterAppWorkers();
  if ("caches" in window) {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  }
}
