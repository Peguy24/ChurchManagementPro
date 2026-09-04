import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "en" | "fr" | "ht";

const T: Record<Lang, any> = {
  en: {
    subject: "Your referral just signed up 🎉",
    title: "Your Referral Signed Up 🎉",
    greeting: (n: string) => `Hello ${n},`,
    body: (c: string) => `Great news — <strong>${c}</strong> just created their church account using your referral link.`,
    next: "Once they subscribe to a paid plan, your reward is applied automatically.",
    cta: "View my referrals",
    footer: "Sent by Church Management Pro",
    fallbackName: "there",
  },
  fr: {
    subject: "Votre filleul vient de s'inscrire 🎉",
    title: "Votre Parrainage S'est Inscrit 🎉",
    greeting: (n: string) => `Bonjour ${n},`,
    body: (c: string) => `Bonne nouvelle — <strong>${c}</strong> vient de créer son compte église avec votre lien de parrainage.`,
    next: "Dès qu'elle souscrit à un forfait payant, votre récompense est appliquée automatiquement.",
    cta: "Voir mes parrainages",
    footer: "Envoyé par Church Management Pro",
    fallbackName: "cher administrateur",
  },
  ht: {
    subject: "Referans ou fèk enskri 🎉",
    title: "Referans Ou Enskri 🎉",
    greeting: (n: string) => `Bonjou ${n},`,
    body: (c: string) => `Bon nouvèl — <strong>${c}</strong> fèk kreye kont legliz li ak lyen referans ou.`,
    next: "Lè yo abònen a yon plan peye, rekonpans ou aplike otomatikman.",
    cta: "Gade referans mwen yo",
    footer: "Voye pa Church Management Pro",
    fallbackName: "chè administratè",
  },
};

const detectLang = (l?: string | null): Lang => {
  const x = (l || "").toLowerCase();
  return x === "fr" || x === "ht" ? (x as Lang) : "en";
};

const esc = (s: string) => String(s ?? "").replace(/<[^>]*>/g, "").slice(0, 120);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const internalKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const auth = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!internalKey || auth !== internalKey) return json({ error: "Unauthorized" }, 401);

    const { referrerTenantId, referredTenantId } = await req.json();
    if (!referrerTenantId || !referredTenantId) return json({ error: "Missing fields" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", internalKey, {
      auth: { persistSession: false },
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ success: false, error: "RESEND_API_KEY not set" });

    const { data: referrer } = await supabase.from("tenants").select("name, slug").eq("id", referrerTenantId).maybeSingle();
    const { data: referred } = await supabase.from("tenants").select("name").eq("id", referredTenantId).maybeSingle();
    const referredName = esc(referred?.name || "A new church");

    const { data: roles } = await supabase
      .from("tenant_user_roles")
      .select("user_id")
      .eq("tenant_id", referrerTenantId)
      .eq("role", "admin")
      .eq("is_approved", true);

    const ids = (roles || []).map((r: any) => r.user_id).filter(Boolean);
    if (!ids.length) return json({ success: true, sent: 0, skipped: "no_admins" });

    const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, language").in("id", ids);
    const profById = new Map((profiles || []).map((p: any) => [p.id, p]));

    let sent = 0;
    for (const id of ids) {
      const { data: u } = await supabase.auth.admin.getUserById(id);
      const email = u?.user?.email;
      if (!email) continue;

      const p: any = profById.get(id);
      const tr = T[detectLang(p?.language)];
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || tr.fallbackName;
      const ctaUrl = referrer?.slug
        ? `https://churchmanagementpro.com/t/${referrer.slug}/auth`
        : "https://churchmanagementpro.com";

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#4F46E5,#6366F1);padding:28px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${tr.title}</h1>
  </div>
  <div style="padding:28px 30px;">
    <p style="color:#334155;font-size:15px;margin:0 0 16px;">${tr.greeting(esc(name))}</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">${tr.body(referredName)}</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">${tr.next}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${tr.cta}</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">${tr.footer}</p>
  </div>
</div></body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Church Management Pro <noreply@churchmanagementpro.com>",
          to: [email],
          subject: tr.subject,
          html,
        }),
      });
      if (res.ok) sent++;
      else console.error("resend error", await res.text());
    }

    return json({ success: true, sent });
  } catch (e: any) {
    console.error("[notify-referral-signup]", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
