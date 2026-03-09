// Date utilities that correctly handle date-only strings (YYYY-MM-DD) in local time.

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayInputValue(): string {
  return formatDateInputValue(new Date());
}

export function isDateOnlyString(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY_RE.test(value);
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !isDateOnlyString(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function toSafeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return parseDateOnly(value) ?? (Number.isNaN(new Date(value).getTime()) ? null : new Date(value));
}

export function formatDateForDisplay(
  value: string | Date | null | undefined,
  locale = "fr-FR",
  options?: Intl.DateTimeFormatOptions
): string {
  const d = toSafeDate(value);
  if (!d) return "";
  return d.toLocaleDateString(locale, options);
}
