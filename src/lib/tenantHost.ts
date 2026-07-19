// Detect whether the current hostname belongs to a tenant's custom domain
// or subdomain, rather than the main platform / preview / localhost.

const PLATFORM_APEX = "churchmanagementpro.com";

/** Returns true when this hostname is our own platform, a Lovable preview,
 *  or local dev — NOT a tenant custom domain. */
export function isPlatformHost(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.startsWith("127.") || h.startsWith("192.168.")) return true;
  if (h === PLATFORM_APEX || h === `www.${PLATFORM_APEX}`) return true;
  if (h.endsWith(".lovable.app") || h.endsWith(".lovable.dev")) return true;
  return false;
}

/** Returns true when this hostname is a `<slug>.churchmanagementpro.com` subdomain. */
export function isPlatformSubdomain(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  if (!h.endsWith(`.${PLATFORM_APEX}`)) return false;
  if (h === `www.${PLATFORM_APEX}`) return false;
  return true;
}

/** Any hostname a public tenant site could be served on. */
export function isTenantHost(hostname: string): boolean {
  return !isPlatformHost(hostname) || isPlatformSubdomain(hostname);
}

export function currentHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export const PLATFORM_DOMAIN = PLATFORM_APEX;
