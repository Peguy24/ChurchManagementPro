/**
 * Shared input sanitizers for finance forms.
 * - sanitizeAmount: keeps only digits + a single decimal separator (.)
 * - todayISO: returns today's date in yyyy-MM-dd
 * - clampNotFuture: returns the same date if not future, otherwise today
 * - isFutureDate: true if the yyyy-MM-dd string is strictly after today
 */
export function sanitizeAmount(raw: string): string {
  // strip everything that isn't a digit or dot, normalize comma to dot
  let v = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  // keep only the first dot
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  // limit to 2 decimals
  if (firstDot !== -1) {
    const [intPart, decPart = ""] = v.split(".");
    v = intPart.slice(0, 12) + "." + decPart.slice(0, 2);
  } else {
    v = v.slice(0, 12);
  }
  return v;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isFutureDate(value: string): boolean {
  if (!value) return false;
  return value > todayISO();
}

export function clampNotFuture(value: string): string {
  if (!value) return value;
  return value > todayISO() ? todayISO() : value;
}

/** Returns yyyy-MM-dd for today + N years (cap for future dates). Default 3 years. */
export function maxFutureISO(years = 3): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Clamps a yyyy-MM-dd date to be at most N years in the future. */
export function clampMaxFuture(value: string, years = 3): string {
  if (!value) return value;
  const cap = maxFutureISO(years);
  return value > cap ? cap : value;
}

/**
 * Generic text sanitizer.
 * - removes control chars
 * - collapses excessive whitespace
 * - enforces a max length
 */
export function sanitizeText(raw: string, maxLength = 200): string {
  if (!raw) return "";
  // remove control chars (except \n and \t)
  let v = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // strip leading whitespace to avoid space-only input
  v = v.replace(/^\s+/, "");
  return v.slice(0, maxLength);
}

/** Single-line variant: also strips newlines. */
export function sanitizeLine(raw: string, maxLength = 120): string {
  return sanitizeText(raw.replace(/[\r\n]+/g, " "), maxLength);
}

/** Reference / code: alphanumerics, dash, underscore, dot, slash, space. */
export function sanitizeReference(raw: string, maxLength = 50): string {
  if (!raw) return "";
  return raw.replace(/[^A-Za-z0-9_\-./ ]/g, "").slice(0, maxLength);
}

/** Person/entity name: letters, spaces, common punctuation. */
export function sanitizeName(raw: string, maxLength = 100): string {
  if (!raw) return "";
  let v = raw.replace(/[\u0000-\u001F\u007F]/g, "");
  v = v.replace(/^\s+/, "");
  return v.slice(0, maxLength);
}

