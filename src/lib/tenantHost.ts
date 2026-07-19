// Detect whether the current hostname belongs to a tenant's custom domain
// or subdomain, rather than the main platform / preview / localhost.

const PLATFORM_APEX = "churchmanagementpro.com";

function normalizedHost(hostname: string): string {
  return (hostname || "").toLowerCase();
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const h = normalizedHost(hostname);
  return h === "localhost" || h.startsWith("127.") || h.startsWith("192.168.");
}

function isLovableManagedHost(hostname: string): boolean {
  const h = normalizedHost(hostname);
  return h.endsWith(".lovable.app") || h.endsWith(".lovable.dev") || h.endsWith(".lovableproject.com");
}

/** Returns true when this hostname is our own platform, a Lovable preview,
 *  or local dev — NOT a tenant custom domain. */
export function isPlatformHost(hostname: string): boolean {
  const h = normalizedHost(hostname);
  if (!h) return true;
  if (isLocalOrPrivateHost(h)) return true;
  if (h === PLATFORM_APEX || h === `www.${PLATFORM_APEX}`) return true;
  if (isLovableManagedHost(h)) return true;
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

/** Preview/dev hosts must render /site/:slug in-place instead of redirecting
 *  to a tenant's primary custom domain, which may not be reachable in preview. */
export function isProjectPreviewHost(hostname: string): boolean {
  const h = normalizedHost(hostname);
  if (isLocalOrPrivateHost(h)) return true;
  if (h.endsWith(".lovable.dev") || h.endsWith(".lovableproject.com")) return true;
  return h.endsWith(".lovable.app") && h.includes("-preview--");
}

export function currentHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

/** Force https on any hostname that is not localhost / private / preview.
 *  Returns true if a redirect was issued (caller should stop rendering). */
export function enforceHttps(): boolean {
  if (typeof window === "undefined") return false;
  const { protocol, hostname, href } = window.location;
  if (protocol === "https:") return false;
  // Skip http on local dev + Lovable preview (preview served on https already,
  // but this is defensive).
  if (isLocalOrPrivateHost(hostname)) {
    return false;
  }
  window.location.replace(href.replace(/^http:/, "https:"));
  return true;
}

export const PLATFORM_DOMAIN = PLATFORM_APEX;
