import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Lang = "en" | "fr" | "ht";
type Action = "plan_activated" | "trial_extended" | "addon_granted" | "addon_extended";

const T: Record<Lang, any> = {
  en: {
    plan_activated: { subject: "Great news — your plan is now active", title: "Your Plan Is Active 🎉", body: (p: string) => `We've activated the <strong>${p}</strong> plan on your account at no charge.` },
    trial_extended: { subject: "Your free trial has been extended", title: "Free Trial Extended 🎁", body: () => "Your free trial has been extended by our team." },
    addon_granted: { subject: "Website add-on activated for your church", title: "Website Add-On Activated 🌐", body: () => "We've enabled the Church Website add-on on your account at no charge." },
    addon_extended: { subject: "Your website add-on has been extended", title: "Website Add-On Extended 🌐", body: () => "Your Church Website add-on access has been extended." },
    greeting: (n: string) => `Hello ${n},`,
    fallbackName: "there",
    until: "Access valid until",
    unlimited: "Access with no expiry date.",
    cta: "Open Dashboard",
    footer: "Sent by Church Management Pro",
  },
  fr: {
    plan_activated: { subject: "Bonne nouvelle — votre forfait est activé", title: "Votre Forfait Est Actif 🎉", body: (p: string) => `Nous avons activé le forfait <strong>${p}</strong> sur votre compte, gratuitement.` },
    trial_extended: { subject: "Votre essai gratuit a été prolongé", title: "Essai Gratuit Prolongé 🎁", body: () => "Votre essai gratuit a été prolongé par notre équipe." },
    addon_granted: { subject: "Module site web activé pour votre église", title: "Module Site Web Activé 🌐", body: () => "Nous avons activé le module Site Web de l'église sur votre compte, gratuitement." },
    addon_extended: { subject: "Votre module site web a été prolongé", title: "Module Site Web Prolongé 🌐", body: () => "Votre accès au module Site Web de l'église a été prolongé." },
    greeting: (n: string) => `Bonjour ${n},`,
    fallbackName: "cher administrateur",
    until: "Accès valide jusqu'au",
    unlimited: "Accès sans date d'expiration.",
    cta: "Ouvrir le tableau de bord",
    footer: "Envoyé par Church Management Pro",
  },
  ht: {
    plan_activated: { subject: "Bon nouvèl — plan ou aktive kounye a", title: "Plan Ou Aktive 🎉", body: (p: string) => `Nou aktive plan <strong>${p}</strong> nan kont ou gratis.` },
    trial_extended: { subject: "Esè gratis ou pwolonje", title: "Esè Gratis Pwolonje 🎁", body: () => "Ekip nou an pwolonje esè gratis ou a." },
    addon_granted: { subject: "Modil sit wèb aktive pou legliz ou", title: "Modil Sit Wèb Aktive 🌐", body: () => "Nou aktive modil Sit Wèb Legliz la nan kont ou gratis." },
    addon_extended: { subject: "Modil sit wèb ou pwolonje", title: "Modil Sit Wèb Pwolonje 🌐", body: () => "Aksè ou nan modil Sit Wèb Legliz la pwolonje." },
    greeting: (n: string) => `Bonjou ${n},`,
    fallbackName: "chè administratè",
    until: "Aksè valid jiska",
    unlimited: "Aksè san dat ekspirasyon.",
    cta: "Ouvri Tablo Bò",
    footer: "Voye pa Church Management Pro",
  },
};

const detectLang = (l?: string | null): Lang => {
  const x = (l || "").toLowerCase();
  return x === "fr" || x === "ht" || x === "en" ? (x as Lang) : "en";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: userData.user.id });
    if (!isSuper) return json({ error: "Forbidden" }, 403);

    const { tenantId, action, planLabel, expiresAt } = await req.json() as {
      tenantId: string; action: Action; planLabel?: string; expiresAt?: string | null;
    };
    if (!tenantId || !action) return json({ error: "Missing fields" }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ success: false, error: "RESEND_API_KEY not set" });

    const { data: tenant } = await supabase.from("tenants").select("name, slug").eq("id", tenantId).single();
    const tenantName = tenant?.name || "Church Management Pro";

    const { data: roles } = await supabase
      .from("tenant_user_roles")
      .select("user_id")
      .eq("tenant_id", tenantId).eq("role", "admin").eq("is_approved", true);

    const ids = (roles || []).map((r: any) => r.user_id).filter(Boolean);
    if (!ids.length) return json({ success: true, sent: 0, skipped: "no_admins" });

    const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name, language").in("id", ids);
    const profById = new Map((profiles || []).map((p: any) => [p.id, p]));

    const users = await Promise.all(ids.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      return { id, email: data?.user?.email as string | undefined };
    }));

    let sent = 0;
    for (const u of users) {
      if (!u.email) continue;
      const p = profById.get(u.id);
      const lang = detectLang(p?.language);
      const tr = T[lang];
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || tr.fallbackName;
      const evt = tr[action];
      const locale = lang === "fr" ? "fr-FR" : lang === "ht" ? "fr-HT" : "en-US";
      const expiryLine = expiresAt
        ? `<p style="margin:0 0 16px;color:#334155;"><strong>${tr.until}:</strong> ${new Date(expiresAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}</p>`
        : (action === "addon_granted" || action === "addon_extended" || action === "plan_activated")
          ? `<p style="margin:0 0 16px;color:#334155;">${tr.unlimited}</p>` : "";

      const ctaUrl = tenant?.slug ? `https://churchmanagementpro.com/t/${tenant.slug}/auth` : "https://churchmanagementpro.com";
      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#4F46E5,#6366F1);padding:28px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${evt.title}</h1>
  </div>
  <div style="padding:28px 30px;">
    <p style="color:#334155;font-size:15px;margin:0 0 16px;">${tr.greeting(name)}</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">${evt.body(planLabel || "")}</p>
    ${expiryLine}
    <div style="text-align:center;margin:24px 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${tr.cta}</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">${tr.footer} — ${tenantName}</p>
  </div>
</div></body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${tenantName} <noreply@churchmanagementpro.com>`,
          to: [u.email],
          subject: `${evt.subject} — ${tenantName}`,
          html,
        }),
      });
      if (res.ok) sent++;
      else console.error("resend error", await res.text());
    }

    return json({ success: true, sent });
  } catch (e: any) {
    console.error("[notify-tenant-comp-action]", e);
    return json({ error: e.message || String(e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
