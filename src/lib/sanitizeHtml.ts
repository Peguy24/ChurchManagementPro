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
