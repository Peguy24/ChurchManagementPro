/**
 * Client-side mirror of the `self-checkin` edge function identity parsing.
 * Used to preview to the visitor exactly how their input will be matched
 * (member number vs phone) before they submit.
 */

const COUNTRY_CODES = ["509", "590", "596", "1", "33", "32", "41", "49", "44", "39", "34", "351", "352"];

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Reduces a phone number to its national significant digits. */
export function phoneCore(value: string): string {
  let d = digitsOnly(value);
  if (!d) return "";
  d = d.replace(/^(00|011)/, "");
  for (const cc of [...COUNTRY_CODES].sort((a, b) => b.length - a.length)) {
    if (d.startsWith(cc) && d.length - cc.length >= 7) {
      d = d.slice(cc.length);
      break;
    }
  }
  return d.replace(/^0+/, "");
}

/** Normalizes a member-number-looking input to the MBR00000 format. */
export function memberNumberCore(value: string): string | null {
  const raw = value.trim().replace(/[\s-]/g, "");
  if (!raw) return null;
  if (!/^[a-z]*\d+$/i.test(raw)) return null;
  const d = digitsOnly(raw);
  if (!d || d.length > 8) return null;
  const prefix = raw.replace(/\d/g, "").toUpperCase();
  if (prefix && prefix !== "MBR") return null;
  return `MBR${d.padStart(5, "0")}`;
}

export type IdentifierPreview =
  | { kind: "empty" }
  | { kind: "invalid"; reason: "too_short" | "unrecognized" }
  | { kind: "member_number"; normalized: string }
  | { kind: "phone"; normalized: string };

/** Sanitizes raw keyboard input: allowed chars only, capped length. */
export function sanitizeIdentifier(raw: string): string {
  return raw.replace(/[^0-9A-Za-z+\-().\s]/g, "").slice(0, 40);
}

export function previewIdentifier(raw: string): IdentifierPreview {
  const value = raw.trim();
  if (!value) return { kind: "empty" };

  const d = digitsOnly(value);
  const looksLikePhone = /^\+|^00\d/.test(value) || d.length >= 8;

  if (!looksLikePhone) {
    const mbr = memberNumberCore(value);
    if (mbr) return { kind: "member_number", normalized: mbr };
  }

  const core = phoneCore(value);
  if (core.length >= 7) {
    return { kind: "phone", normalized: formatPhoneCore(core) };
  }

  const mbr = memberNumberCore(value);
  if (mbr) return { kind: "member_number", normalized: mbr };

  if (d.length > 0 && d.length < 7) return { kind: "invalid", reason: "too_short" };
  return { kind: "invalid", reason: "unrecognized" };
}

/** Groups the national digits for readability, e.g. 37123456 -> 3712 3456. */
export function formatPhoneCore(core: string): string {
  if (core.length === 8) return `${core.slice(0, 4)} ${core.slice(4)}`;
  if (core.length === 10) return `${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`;
  return core.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
