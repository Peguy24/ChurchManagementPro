import DOMPurify from "dompurify";

/** Sanitize rich-text/HTML coming from admin composers before storing or rendering. */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: [
      "a", "b", "strong", "i", "em", "u", "s", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div", "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "title"],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["style", "onerror", "onload", "onclick"],
  });
}

/**
 * Return a safe href for user-supplied URLs, or null when the scheme is unsafe.
 * Allows http(s), mailto:, tel:, and site-relative paths only.
 */
export function safeExternalUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^\/(?!\/)/.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null; // any other scheme (javascript:, data:, etc.)
  return `https://${trimmed}`;
}
