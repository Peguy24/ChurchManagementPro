import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPPORT_EMAIL = "support@churchmanagementpro.com";

// Simple in-memory rate limit: max 3 requests per IP per 10 minutes.
// Note: per-instance only — best-effort spam mitigation, not a hard guarantee.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
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
  // Opportunistic cleanup
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      const fresh = v.filter((t) => now - t < RATE_WINDOW_MS);
      if (fresh.length === 0) ipHits.delete(k);
      else ipHits.set(k, fresh);
    }
  }
  return false;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// ---------- CAPTCHA (HMAC-signed math challenge, no external service) ----------
const CAPTCHA_SECRET = Deno.env.get("CRON_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "fallback-captcha-secret";
const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const usedCaptchaNonces = new Map<string, number>(); // nonce -> expiry

const enc = new TextEncoder();
async function hmacHex(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(CAPTCHA_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function makeCaptcha(): Promise<{ a: number; b: number; nonce: string; expiry: number; sig: string }> {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const nonce = crypto.randomUUID();
  const expiry = Date.now() + CAPTCHA_TTL_MS;
  const sig = await hmacHex(`${a}|${b}|${nonce}|${expiry}`);
  return { a, b, nonce, expiry, sig };
}

async function verifyCaptcha(c: { a?: unknown; b?: unknown; nonce?: unknown; expiry?: unknown; sig?: unknown; answer?: unknown }): Promise<boolean> {
  const a = Number(c.a), b = Number(c.b), expiry = Number(c.expiry);
  const nonce = String(c.nonce ?? ""), sig = String(c.sig ?? ""), answer = Number(c.answer);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(expiry) || !nonce || !sig || !Number.isFinite(answer)) return false;
  if (Date.now() > expiry) return false;
  // Single-use
  if (usedCaptchaNonces.has(nonce)) return false;
  const expected = await hmacHex(`${a}|${b}|${nonce}|${expiry}`);
  if (expected !== sig) return false;
  if (a + b !== answer) return false;
  usedCaptchaNonces.set(nonce, expiry);
  // Cleanup
  if (usedCaptchaNonces.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of usedCaptchaNonces) if (exp < now) usedCaptchaNonces.delete(k);
  }
  return true;
}

async function captchaChallengeResponse(status: number, errorMessage: string) {
  const challenge = await makeCaptcha();
  return new Response(
    JSON.stringify({ error: errorMessage, captchaRequired: true, challenge }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();
    const website = String(body.website ?? "");
    const elapsedMs = Number(body.elapsedMs ?? 0);
    const langRaw = String(body.language ?? "en").toLowerCase();
    const language: "fr" | "ht" | "en" = langRaw === "fr" || langRaw === "ht" ? langRaw : "en";

    // Verify captcha if client provided one (used to bypass rate-limit / timing gates)
    const captchaSolved = body.captcha ? await verifyCaptcha(body.captcha) : false;

    // Rate limit — bypassable with a valid captcha
    if (!captchaSolved && isRateLimited(ip)) {
      return await captchaChallengeResponse(429, "Too many requests. Please solve the captcha to continue.");
    }

    // Honeypot: real users never fill this field — silent drop
    if (website.length > 0) {
      console.warn("Honeypot triggered from", ip);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    // Submitted suspiciously fast (< 2s) → bot-like; require captcha instead of dropping
    if (!captchaSolved && elapsedMs > 0 && elapsedMs < 2000) {
      console.warn("Submission too fast from", ip, elapsedMs);
      return await captchaChallengeResponse(200, "Please confirm you are human.");
    }

    if (name.length < 2 || name.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (message.length < 10 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message must be 10-2000 characters" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Persist to DB (best-effort, never blocks email)
    let insertedMessageId: string | null = null;
    try {
      const { data: inserted } = await supabaseAdmin
        .from("contact_messages")
        .insert({
          name,
          email,
          message,
          language,
          ip_address: ip,
          user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
        })
        .select("id")
        .single();
      insertedMessageId = inserted?.id ?? null;
    } catch (dbErr) {
      console.error("Failed to persist contact message (non-fatal):", dbErr);
    }

    // Notify Super Admins in real time via platform_notifications
    try {
      const preview = message.length > 140 ? message.slice(0, 140) + "..." : message;
      await supabaseAdmin.from("platform_notifications").insert({
        notification_type: "contact_message",
        severity: "info",
        title: `New contact message from ${name}`,
        message: preview,
        tenant_id: null,
        metadata: {
          contact_message_id: insertedMessageId,
          name,
          email,
          language,
          ip,
        },
      });
    } catch (notifErr) {
      console.error("Failed to create platform notification (non-fatal):", notifErr);
    }

    // Email opted-in Super Admins
    try {
      const { data: recipients } = await supabaseAdmin.rpc("get_contact_message_email_recipients");
      const toList = (recipients ?? [])
        .map((r: { email: string | null }) => r.email)
        .filter((e: string | null): e is string => !!e);
      if (toList.length > 0) {
        await resend.emails.send({
          from: "Church Management Pro <noreply@churchmanagementpro.com>",
          to: toList,
          reply_to: email,
          subject: `[Contact] New message from ${name}`,
          html: `
            <div style="font-family: Arial, sans-serif; color:#1f2937; max-width:560px;">
              <h2 style="color:#111827;">New contact form submission</h2>
              <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
              <p><strong>Language:</strong> ${language}</p>
              <div style="margin-top:16px; padding:14px; background:#f9fafb; border-left:4px solid #2563eb; border-radius:4px; white-space:pre-wrap;">${escapeHtml(message)}</div>
              <p style="margin-top:20px; font-size:12px; color:#6b7280;">You receive these emails because your Super Admin notification preferences include email alerts. Update them in the notifications panel.</p>
            </div>
          `,
        });
      }
    } catch (adminEmailErr) {
      console.error("Super-admin email broadcast failed (non-fatal):", adminEmailErr);
    }

    await resend.emails.send({
      from: "Church Management Pro <noreply@churchmanagementpro.com>",
      to: [SUPPORT_EMAIL],
      reply_to: email,
      subject: `[Contact] Message from ${name}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Language:</strong> ${language}</p>
        <hr>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      `,
    });

    // Confirmation email to the visitor (best-effort, never blocks success)
    const confirmations = {
      fr: {
        subject: "Nous avons bien reçu votre message",
        greeting: `Bonjour ${escapeHtml(name)},`,
        body: "Merci de nous avoir contactés. Notre équipe a bien reçu votre message et vous répondra dans les plus brefs délais.",
        recap: "Récapitulatif de votre message :",
        signature: "L'équipe Church Management Pro",
      },
      ht: {
        subject: "Nou resevwa mesaj ou",
        greeting: `Bonjou ${escapeHtml(name)},`,
        body: "Mèsi paske ou kontakte nou. Ekip nou resevwa mesaj ou epi n ap reponn ou pi vit posib.",
        recap: "Rezime mesaj ou :",
        signature: "Ekip Church Management Pro",
      },
      en: {
        subject: "We received your message",
        greeting: `Hello ${escapeHtml(name)},`,
        body: "Thank you for reaching out. Our team has received your message and will get back to you as soon as possible.",
        recap: "Your message:",
        signature: "The Church Management Pro team",
      },
    } as const;
    const c = confirmations[language];

    try {
      await resend.emails.send({
        from: "Church Management Pro <noreply@churchmanagementpro.com>",
        to: [email],
        reply_to: SUPPORT_EMAIL,
        subject: c.subject,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1f2937; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #111827; margin: 0 0 16px;">${c.greeting}</h2>
            <p style="font-size: 14px; line-height: 1.6;">${c.body}</p>
            <div style="margin-top: 20px; padding: 16px; background: #f9fafb; border-left: 4px solid #2563eb; border-radius: 4px;">
              <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px; color: #374151;">${c.recap}</p>
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <p style="margin-top: 24px; font-size: 13px; color: #6b7280;">${c.signature}</p>
          </div>
        `,
      });
    } catch (confirmErr) {
      console.error("Confirmation email failed (non-fatal):", confirmErr);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-public-contact error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
