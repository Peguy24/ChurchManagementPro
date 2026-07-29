import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Rotating token settings
const SLOT_SECONDS = 45;
const SLOT_TOLERANCE = 1; // previous slot stays valid

// Best-effort per-instance rate limiting for the public endpoints
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 20;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => now - t < RATE_WINDOW_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig)).slice(0, 22);
}

function currentSlot(): number {
  return Math.floor(Date.now() / 1000 / SLOT_SECONDS);
}

async function buildToken(sessionId: string, secret: string, slot: number) {
  const payload = `${sessionId}.${slot}`;
  return `${payload}.${await sign(secret, payload)}`;
}

type SessionRow = {
  id: string;
  tenant_id: string;
  event_id: string;
  branch_id: string | null;
  secret: string;
  venue_lat: number | null;
  venue_lng: number | null;
  radius_m: number;
  require_location: boolean;
  is_open: boolean;
};

async function resolveToken(token: string): Promise<
  { session: SessionRow } | { error: string; status: number }
> {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { error: "invalid_token", status: 400 };
  const [sessionId, slotStr, sig] = parts;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return { error: "invalid_token", status: 400 };
  const slot = Number(slotStr);
  if (!Number.isFinite(slot)) return { error: "invalid_token", status: 400 };

  const { data: session, error } = await supabaseAdmin
    .from("self_checkin_sessions")
    .select(
      "id, tenant_id, event_id, branch_id, secret, venue_lat, venue_lng, radius_m, require_location, is_open",
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) return { error: "session_not_found", status: 404 };

  const expected = await sign(session.secret, `${sessionId}.${slot}`);
  if (expected !== sig) return { error: "invalid_token", status: 400 };

  const now = currentSlot();
  if (slot > now + 1 || slot < now - SLOT_TOLERANCE) {
    return { error: "expired_token", status: 410 };
  }
  if (!session.is_open) return { error: "session_closed", status: 403 };

  return { session: session as SessionRow };
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function maskName(first: string, last: string): string {
  const l = (last || "").trim();
  return `${(first || "").trim()} ${l ? `${l.charAt(0).toUpperCase()}.` : ""}`.trim();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Reduces a phone number to its national significant digits so that
 * "+509 3712-3456", "00509 37123456", "0 3712 3456" and "37123456" all match.
 * Handles international prefixes (00/011), common country codes (509 HT,
 * 1 US/CA, 33 FR, 590/509-style 3-digit codes) and national trunk zeros.
 */
const COUNTRY_CODES = ["509", "590", "596", "1", "33", "32", "41", "49", "44", "39", "34", "351", "352"];

function phoneCore(value: string): string {
  let d = normalizePhone(value);
  if (!d) return "";
  // international access prefixes
  d = d.replace(/^(00|011)/, "");
  // country code
  for (const cc of COUNTRY_CODES.slice().sort((a, b) => b.length - a.length)) {
    if (d.startsWith(cc) && d.length - cc.length >= 7) {
      d = d.slice(cc.length);
      break;
    }
  }
  // national trunk prefix zeros
  d = d.replace(/^0+/, "");
  return d;
}

function phoneMatches(input: string, stored: string): boolean {
  const a = phoneCore(input);
  const b = phoneCore(stored);
  if (a.length < 6 || b.length < 6) return false;
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  if (min < 7) return false;
  // tolerate leftover prefixes on either side
  return a.slice(-min) === b.slice(-min);
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    // ---------- Display screen: mint a fresh rotating token (auth required) ----------
    if (action === "token") {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: userData } = await userClient.auth.getUser();
      const user = userData?.user;
      if (!user) return json({ error: "unauthorized" }, 401);

      const body = await req.json().catch(() => ({}));
      const sessionId = String(body.sessionId ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return json({ error: "invalid_session" }, 400);

      // RLS on the user client guarantees the session belongs to the caller's tenant
      const { data: allowed } = await userClient
        .from("self_checkin_sessions")
        .select("id, is_open")
        .eq("id", sessionId)
        .maybeSingle();
      if (!allowed) return json({ error: "forbidden" }, 403);
      if (!allowed.is_open) return json({ error: "session_closed" }, 403);

      const { data: session } = await supabaseAdmin
        .from("self_checkin_sessions")
        .select("secret")
        .eq("id", sessionId)
        .maybeSingle();
      if (!session) return json({ error: "session_not_found" }, 404);

      const slot = currentSlot();
      return json({
        token: await buildToken(sessionId, session.secret, slot),
        expiresInSeconds: SLOT_SECONDS - (Math.floor(Date.now() / 1000) % SLOT_SECONDS),
        slotSeconds: SLOT_SECONDS,
      });
    }

    if (isRateLimited(ip)) return json({ error: "rate_limited" }, 429);

    const body = await req.json().catch(() => ({}));

    // ---------- Member phone: resolve the scanned token into event/church info ----------
    if (action === "resolve") {
      const result = await resolveToken(String(body.token ?? ""));
      if ("error" in result) return json({ error: result.error }, result.status);
      const { session } = result;

      const [{ data: event }, { data: tenant }] = await Promise.all([
        supabaseAdmin
          .from("events")
          .select("id, name, event_date, event_time, location")
          .eq("id", session.event_id)
          .maybeSingle(),
        supabaseAdmin
          .from("tenants")
          .select("id, name, logo_url, primary_color")
          .eq("id", session.tenant_id)
          .maybeSingle(),
      ]);

      return json({
        sessionId: session.id,
        requireLocation: session.require_location && session.venue_lat !== null,
        radiusM: session.radius_m,
        event: event ?? null,
        church: tenant
          ? { name: tenant.name, logoUrl: tenant.logo_url, primaryColor: tenant.primary_color }
          : null,
      });
    }

    // ---------- Member phone: record the attendance ----------
    if (action === "checkin") {
      const result = await resolveToken(String(body.token ?? ""));
      if ("error" in result) return json({ error: result.error }, result.status);
      const { session } = result;

      const identifier = String(body.identifier ?? "").trim();
      const memberQr = String(body.memberQr ?? "").trim();
      if (!identifier && !memberQr) return json({ error: "identity_required" }, 400);
      if (identifier.length > 60 || memberQr.length > 120) {
        return json({ error: "identity_required" }, 400);
      }

      // Location check
      const lat = typeof body.lat === "number" ? body.lat : null;
      const lng = typeof body.lng === "number" ? body.lng : null;
      let locationVerified: boolean | null = null;

      if (session.venue_lat !== null && session.venue_lng !== null) {
        if (lat === null || lng === null) {
          if (session.require_location) return json({ error: "location_required" }, 403);
          locationVerified = false;
        } else {
          const dist = distanceMeters(lat, lng, session.venue_lat, session.venue_lng);
          locationVerified = dist <= session.radius_m;
          if (!locationVerified && session.require_location) {
            return json({ error: "too_far", distance: Math.round(dist) }, 403);
          }
        }
      }

      // Member lookup — always scoped to the session's tenant
      let member: { id: string; first_name: string; last_name: string; branch_id: string | null } | null = null;

      if (memberQr) {
        const code = memberQr.replace(/^MEMBER-/i, "").trim();
        const { data } = await supabaseAdmin
          .from("members")
          .select("id, first_name, last_name, branch_id")
          .eq("tenant_id", session.tenant_id)
          .or(`qr_code.eq.${code},id.eq.${/^[0-9a-f-]{36}$/i.test(code) ? code : "00000000-0000-0000-0000-000000000000"}`)
          .maybeSingle();
        member = data ?? null;
      }

      if (!member && identifier) {
        const raw = identifier.trim();

        // 1) member number — case/format tolerant (MBR00023, mbr00023, 23, 00023)
        const digitsOnly = raw.replace(/\D/g, "");
        const candidatesNumbers = new Set<string>([raw, raw.toUpperCase()]);
        if (digitsOnly && digitsOnly.length <= 8 && /^[a-z]*\d+$/i.test(raw.replace(/[\s-]/g, ""))) {
          candidatesNumbers.add(`MBR${digitsOnly.padStart(5, "0")}`);
        }

        const { data: byNumber } = await supabaseAdmin
          .from("members")
          .select("id, first_name, last_name, branch_id")
          .eq("tenant_id", session.tenant_id)
          .in("member_number", Array.from(candidatesNumbers))
          .limit(1);
        member = byNumber?.[0] ?? null;

        // 2) phone — compare on digits only, in either direction
        if (!member) {
          const digits = normalizePhone(raw);
          if (digits.length >= 7) {
            const { data: candidates } = await supabaseAdmin
              .from("members")
              .select("id, first_name, last_name, branch_id, phone")
              .eq("tenant_id", session.tenant_id)
              .not("phone", "is", null)
              .limit(5000);
            const matches = (candidates ?? []).filter((m) => {
              const p = normalizePhone(m.phone ?? "");
              return p.length >= 7 && (p.endsWith(digits) || digits.endsWith(p));
            });
            if (matches.length === 1) member = matches[0];
          }
        }
      }


      if (!member) return json({ error: "member_not_found" }, 404);

      const { data: event } = await supabaseAdmin
        .from("events")
        .select("id, name, event_date")
        .eq("id", session.event_id)
        .maybeSingle();

      const eventDate = event?.event_date ?? new Date().toISOString().slice(0, 10);

      const { data: existing } = await supabaseAdmin
        .from("attendance_records")
        .select("id")
        .eq("member_id", member.id)
        .eq("event_id", session.event_id)
        .eq("event_date", eventDate)
        .maybeSingle();

      if (existing) {
        return json({
          status: "already",
          memberName: maskName(member.first_name, member.last_name),
          eventName: event?.name ?? null,
        });
      }

      const { error: insertError } = await supabaseAdmin
        .from("attendance_records")
        .insert({
          tenant_id: session.tenant_id,
          member_id: member.id,
          event_id: session.event_id,
          event_type: event?.name ?? "Culte",
          event_date: eventDate,
          branch_id: member.branch_id ?? session.branch_id,
          scan_method: "self_checkin",
          marked_by: null,
          marked_at: new Date().toISOString(),
          location_verified: locationVerified,
          self_checkin_session_id: session.id,
        });

      if (insertError) {
        // Unique index means a concurrent duplicate landed first
        if ((insertError as { code?: string }).code === "23505") {
          return json({
            status: "already",
            memberName: maskName(member.first_name, member.last_name),
            eventName: event?.name ?? null,
          });
        }
        console.error("self-checkin insert failed:", insertError);
        return json({ error: "insert_failed" }, 500);
      }

      const { count } = await supabaseAdmin
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .eq("self_checkin_session_id", session.id);

      await supabaseAdmin
        .from("self_checkin_sessions")
        .update({ checkin_count: count ?? 0 })
        .eq("id", session.id);

      return json({
        status: "ok",
        memberName: maskName(member.first_name, member.last_name),
        eventName: event?.name ?? null,
        locationVerified,
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    console.error("self-checkin error:", err);
    return json({ error: "server_error" }, 500);
  }
});
