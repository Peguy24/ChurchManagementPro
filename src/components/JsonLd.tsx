import { useEffect } from "react";

/**
 * Injects a JSON-LD <script> tag into <head> for the current route.
 * Auto-removes on unmount so per-route structured data doesn't leak
 * across navigations. Works for JS-executing crawlers (Googlebot).
 */
export function JsonLd({ id, data }: { id: string; data: Record<string, any> | Record<string, any>[] }) {
  useEffect(() => {
    if (!data) return;
    const scriptId = `jsonld-${id}`;
    // Remove any stale tag with the same id (e.g. React strict-mode double invoke)
    document.getElementById(scriptId)?.remove();
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    try {
      script.text = JSON.stringify(data);
    } catch {
      return;
    }
    document.head.appendChild(script);
    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [id, JSON.stringify(data)]);
  return null;
}
