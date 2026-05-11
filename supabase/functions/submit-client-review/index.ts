// Submit a client review (verified, logged-in users only).
// Inserts the review (RLS enforces ownership) and best-effort emails opted-in Super Admins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

type Payload = {
  reviewer_name?: string;
  reviewer_role?: string | null;
  church_name?: string;
  city?: string | null;
  country?: string | null;
  rating?: number;
  text?: string;
  language?: string;
  consent_public_display?: boolean;
};

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return bad("Unauthorized", 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return bad("Unauthorized", 401);
    const user = userData.user;

    const body = (await req.json().catch(() => ({}))) as Payload;

    const reviewer_name = clean(body.reviewer_name, 100);
    const reviewer_role = body.reviewer_role ? clean(body.reviewer_role, 60) : null;
    const church_name = clean(body.church_name, 120);
    const city = body.city ? clean(body.city, 80) : null;
    const country = body.country ? clean(body.country, 80) : null;
    const text = clean(body.text, 500);
    const rating = Number(body.rating);
    const language = ["fr", "en", "ht"].includes(String(body.language))
      ? String(body.language)
      : "fr";
    const consent = body.consent_public_display === true;

    if (!reviewer_name) return bad("reviewer_name required");
    if (!church_name) return bad("church_name required");
    if (text.length < 10) return bad("text must be at least 10 characters");
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return bad("rating must be 1-5");
    if (!consent) return bad("consent required");

    // Resolve tenant_id from profile
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    // Insert via user client so RLS + trigger apply
    const { data: inserted, error: insErr } = await userClient
      .from("client_reviews")
      .insert({
        user_id: user.id,
        tenant_id: profile?.tenant_id ?? null,
        reviewer_name,
        reviewer_role,
        church_name,
        city,
        country,
        rating,
        text,
        language,
        consent_public_display: true,
      })
      .select("id")
      .single();

    if (insErr) {
      // Unique-constraint = already has an active review
      if ((insErr as { code?: string }).code === "23505") {
        return bad(
          "You already have a pending or approved review. Edit your existing review instead.",
          409,
        );
      }
      return bad(insErr.message, 400);
    }

    // Best-effort: email opted-in super admins
    if (RESEND_API_KEY) {
      try {
        const { data: recipients } = await admin.rpc(
          "get_client_review_email_recipients",
        );
        const emails = (recipients ?? [])
          .map((r: { email: string }) => r.email)
          .filter(Boolean);
        if (emails.length > 0) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Church Management Pro <noreply@churchmanagementpro.com>",
              to: emails,
              subject: `New client review: ${reviewer_name} (${rating}/5)`,
              html: `
                <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:24px;">
                  <h2 style="color:#1e40af;margin:0 0 16px;">New Client Review</h2>
                  <p style="margin:0 0 8px;"><strong>${reviewer_name}</strong>${
                reviewer_role ? ` — ${reviewer_role}` : ""
              }</p>
                  <p style="margin:0 0 8px;color:#64748b;">${church_name}${
                city || country
                  ? ` · ${[city, country].filter(Boolean).join(", ")}`
                  : ""
              }</p>
                  <p style="margin:0 0 16px;color:#f59e0b;">${"★".repeat(
                    rating,
                  )}${"☆".repeat(5 - rating)}</p>
                  <blockquote style="border-left:3px solid #1e40af;padding:8px 16px;margin:0 0 16px;color:#334155;">
                    ${text.replace(/</g, "&lt;")}
                  </blockquote>
                  <a href="https://churchmanagementpro.com/super-admin/reviews"
                     style="display:inline-block;background:#1e40af;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">
                    Review in moderation panel
                  </a>
                </div>`,
            }),
          });
        }
      } catch (e) {
        console.warn("review email failed", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, id: inserted.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-client-review error", e);
    return bad("Internal error", 500);
  }
});
