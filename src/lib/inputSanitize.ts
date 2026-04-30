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
