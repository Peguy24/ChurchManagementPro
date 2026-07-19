import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EmailLang = 'en' | 'fr' | 'ht';

const translations: Record<EmailLang, {
  subject: string;
  title: string;
  greeting: (name: string) => string;
  body: string;
  cta: string;
  footer: string;
  fallbackName: string;
}> = {
  en: {
    subject: "🎁 Your free trial expires soon",
    title: "Your Free Trial Expires Soon",
    greeting: (name) => `Hello ${name},`,
    body: "Your free trial ends on <strong>{date}</strong>. Upgrade now to keep access to all your church management features without interruption.",
    cta: "Upgrade Now",
    footer: "Don't lose your data — upgrade before your trial expires.",
    fallbackName: "there",
  },
  fr: {
    subject: "🎁 Votre essai gratuit expire bientôt",
    title: "Votre Essai Gratuit Expire Bientôt",
    greeting: (name) => `Bonjour ${name},`,
    body: "Votre essai gratuit se termine le <strong>{date}</strong>. Passez à un forfait payant maintenant pour conserver l'accès à toutes vos fonctionnalités sans interruption.",
    cta: "Passer au Forfait Payant",
    footer: "Ne perdez pas vos données — passez à un forfait avant la fin de votre essai.",
    fallbackName: "cher administrateur",
  },
  ht: {
    subject: "🎁 Esè gratis ou prèske fini",
    title: "Esè Gratis Ou Prèske Fini",
    greeting: (name) => `Bonjou ${name},`,
    body: "Esè gratis ou ap fini <strong>{date}</strong>. Mete ajou kounye a pou kenbe aksè nan tout fonksyonalite jesyon legliz ou yo san entèripsyon.",
    cta: "Mete Ajou Kounye a",
    footer: "Pa pèdi done ou yo — mete ajou anvan esè ou fini.",
    fallbackName: "chè administratè",
  },
};

const detectLang = (raw?: string | null): EmailLang => {
  if (!raw) return 'en';
  const l = raw.toLowerCase().trim();
  if (l === 'fr' || l === 'ht') return l;
  if (l === 'en') return 'en';
  return 'en';
};

const colors = { bg: "#4F46E5", accent: "#6366F1" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authn + super-admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: userData.user.id });
    if (!isSuper) return json({ error: "Forbidden" }, 403);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not set" }, 500);
    const resend = new Resend(resendKey);

    const body = await req.json().catch(() => ({}));
    const tenantIds: string[] | undefined = body.tenantIds;
    const daysThreshold: number = Number.isFinite(body.daysThreshold) ? body.daysThreshold : 7;
    const includeExpired: boolean = body.includeExpired === true;
    const onlyExpired: boolean = body.onlyExpired === true;
    const customSubject: string | undefined = typeof body.customSubject === "string" && body.customSubject.trim() ? body.customSubject.trim() : undefined;
    const customMessage: string | undefined = typeof body.customMessage === "string" && body.customMessage.trim() ? body.customMessage.trim() : undefined;

    // Load target trial subscriptions
    let query = supabase
      .from("tenant_subscriptions")
      .select("tenant_id, trial_ends_at, status")
      .eq("status", "trial")
      .not("trial_ends_at", "is", null);
    if (Array.isArray(tenantIds) && tenantIds.length > 0) {
      query = query.in("tenant_id", tenantIds);
    }
    const { data: subs, error: subErr } = await query;
    if (subErr) return json({ error: subErr.message }, 500);

    const now = new Date();
    let sent = 0;
    const skipped: string[] = [];

    for (const sub of subs || []) {
      if (!sub.trial_ends_at) continue;
      const endDate = new Date(sub.trial_ends_at);
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
      const isExpired = daysLeft < 0;
      if (onlyExpired) {
        if (!isExpired) { skipped.push(sub.tenant_id); continue; }
      } else if (isExpired) {
        if (!includeExpired) { skipped.push(sub.tenant_id); continue; }
      } else if (daysLeft > daysThreshold) {
        skipped.push(sub.tenant_id);
        continue;
      }

      // Admin emails + names
      const { data: adminRoles } = await supabase
        .from("tenant_user_roles")
        .select("user_id")
        .eq("tenant_id", sub.tenant_id)
        .eq("role", "admin")
        .eq("is_approved", true);

      const adminUserIds = (adminRoles || []).map((r: any) => r.user_id).filter(Boolean);
      if (adminUserIds.length === 0) { skipped.push(sub.tenant_id); continue; }

      // Fetch names and emails in parallel
      const [authUsersResult, profilesResult] = await Promise.all([
        Promise.all(adminUserIds.map(async (id: string) => {
          const { data: u } = await supabase.auth.admin.getUserById(id);
          return { id, email: u?.user?.email || null };
        })),
        supabase.from("profiles").select("id, first_name, last_name, language").in("id", adminUserIds),
      ]);

      const profilesById = new Map((profilesResult.data || []).map((p: any) => [p.id, p]));
      const lang = detectLang(profilesResult.data?.[0]?.language);

      const recipients: { email: string; name: string }[] = [];
      for (const au of authUsersResult) {
        if (!au.email) continue;
        const p = profilesById.get(au.id);
        const firstName = p?.first_name?.trim();
        const lastName = p?.last_name?.trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        recipients.push({ email: au.email, name: fullName });
      }
      if (recipients.length === 0) { skipped.push(sub.tenant_id); continue; }

      const { data: tenant } = await supabase.from("tenants").select("name").eq("id", sub.tenant_id).single();
      const tenantName = tenant?.name || "Church Management Pro";
      const t = translations[lang] || translations.en;
      const locale = lang === "fr" ? "fr-FR" : lang === "ht" ? "fr-HT" : "en-US";
      const dateStr = endDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

      const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
      const customBlock = customMessage
        ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px 18px;border-radius:8px;margin:0 0 20px;color:#78350f;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(customMessage)}</div>`
        : "";

      for (const recipient of recipients) {
        const displayName = recipient.name || t.fallbackName;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,${colors.bg} 0%,${colors.accent} 100%);padding:30px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${t.title}</h1>
    </div>
    <div style="padding:30px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">${t.greeting(escapeHtml(displayName))}</p>
      ${customBlock}
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 20px;">${t.body.replace("{date}", dateStr)}</p>
      <div style="text-align:center;margin:25px 0;">
        <a href="https://churchmanagementpro.com/settings/subscription" style="display:inline-block;background:${colors.bg};color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${t.cta}</a>
      </div>
      <p style="color:#6b7280;font-size:13px;text-align:center;margin:20px 0 0;">${t.footer}</p>
    </div>
    <div style="background:#f8fafc;padding:15px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${tenantName}</p>
    </div>
  </div>
</body></html>`;

        await resend.emails.send({
          from: `${tenantName} <noreply@churchmanagementpro.com>`,
          to: [recipient.email],
          subject: customSubject ? `${customSubject} — ${tenantName}` : `${t.subject} — ${tenantName}`,
          html,
        });
      }
      sent += recipients.length;
    }

    return json({ success: true, sent, skipped: skipped.length });
  } catch (e) {
    console.error("[send-trial-ending-reminders]", e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
