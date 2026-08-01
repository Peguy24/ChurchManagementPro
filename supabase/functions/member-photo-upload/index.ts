import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;
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
  return false;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LinkRow = {
  id: string;
  tenant_id: string;
  member_id: string;
  expires_at: string;
  used_at: string | null;
};

async function resolveLink(
  token: unknown,
): Promise<{ link: LinkRow } | { error: string; status: number }> {
  const t = String(token || "");
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(t)) {
    return { error: "invalid_token", status: 400 };
  }
  const { data, error } = await supabaseAdmin
    .from("member_photo_links")
    .select("id, tenant_id, member_id, expires_at, used_at")
    .eq("token", t)
    .maybeSingle();

  if (error || !data) return { error: "invalid_token", status: 404 };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { error: "expired", status: 410 };
  }
  return { link: data as LinkRow };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ error: "rate_limited" }, 429);

  try {
    const body = await req.json();
    const action = String(body?.action || "");

    const resolved = await resolveLink(body?.token);
    if ("error" in resolved) {
      return json({ error: resolved.error }, resolved.status);
    }
    const { link } = resolved;

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, first_name, last_name")
      .eq("id", link.member_id)
      .maybeSingle();

    if (!member) return json({ error: "member_not_found" }, 404);

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name, logo_url, primary_color")
      .eq("id", link.tenant_id)
      .maybeSingle();

    if (action === "info") {
      return json({
        memberName: `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
        churchName: tenant?.name ?? "",
        logoUrl: tenant?.logo_url ?? null,
        primaryColor: tenant?.primary_color ?? null,
        alreadySubmitted: !!link.used_at,
      });
    }

    if (action === "upload") {
      const image = String(body?.image || "");
      const match = image.match(/^data:image\/(jpeg|jpg|png);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return json({ error: "invalid_image" }, 400);

      const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      if (bytes.length > 3 * 1024 * 1024) {
        return json({ error: "image_too_large" }, 413);
      }

      const ext = match[1] === "png" ? "png" : "jpg";
      const path = `pending/${link.member_id}.${ext}`;

      const { error: upErr } = await supabaseAdmin.storage
        .from("member-photos")
        .upload(path, bytes, {
          contentType: `image/${ext === "jpg" ? "jpeg" : "png"}`,
          upsert: true,
        });

      if (upErr) {
        console.error("upload failed", upErr.message);
        return json({ error: "upload_failed" }, 500);
      }

      await supabaseAdmin
        .from("members")
        .update({ pending_photo_url: path, pending_photo_at: new Date().toISOString() })
        .eq("id", link.member_id);

      await supabaseAdmin
        .from("member_photo_links")
        .update({ used_at: new Date().toISOString() })
        .eq("id", link.id);

      return json({ success: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("member-photo-upload error", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
