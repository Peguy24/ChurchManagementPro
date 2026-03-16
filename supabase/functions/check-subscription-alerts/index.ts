import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AlertType = "expiring_soon" | "expired" | "renewal_success" | "trial_expiring";

const translations: Record<AlertType, Record<string, { subject: string; title: string; body: string; cta: string; footer: string }>> = {
  expiring_soon: {
    en: {
      subject: "⏰ Your subscription expires soon",
      title: "Your Subscription Expires Soon",
      body: "Your subscription will expire on <strong>{date}</strong>. Renew now to avoid losing access to your church management features.",
      cta: "Renew Now",
      footer: "Don't lose access — renew before your subscription expires.",
    },
    fr: {
      subject: "⏰ Votre abonnement expire bientôt",
      title: "Votre Abonnement Expire Bientôt",
      body: "Votre abonnement expirera le <strong>{date}</strong>. Renouvelez maintenant pour éviter de perdre l'accès à vos fonctionnalités de gestion d'église.",
      cta: "Renouveler Maintenant",
      footer: "Ne perdez pas l'accès — renouvelez avant l'expiration de votre abonnement.",
    },
    ht: {
      subject: "⏰ Abònman ou prèske ekspire",
      title: "Abònman Ou Prèske Ekspire",
      body: "Abònman ou ap ekspire <strong>{date}</strong>. Renouvle kounye a pou evite pèdi aksè nan fonksyonalite jesyon legliz ou yo.",
      cta: "Renouvle Kounye a",
      footer: "Pa pèdi aksè — renouvle anvan abònman ou ekspire.",
    },
  },
  expired: {
    en: {
      subject: "🚫 Your subscription has expired",
      title: "Your Subscription Has Expired",
      body: "Your subscription expired on <strong>{date}</strong>. Your access to church management features is now restricted. Resubscribe to restore full access.",
      cta: "Resubscribe Now",
      footer: "We miss you! Resubscribe to get back to managing your church.",
    },
    fr: {
      subject: "🚫 Votre abonnement a expiré",
      title: "Votre Abonnement a Expiré",
      body: "Votre abonnement a expiré le <strong>{date}</strong>. Votre accès aux fonctionnalités de gestion est maintenant restreint. Réabonnez-vous pour restaurer l'accès complet.",
      cta: "Se Réabonner",
      footer: "Vous nous manquez ! Réabonnez-vous pour continuer à gérer votre église.",
    },
    ht: {
      subject: "🚫 Abònman ou ekspire",
      title: "Abònman Ou Ekspire",
      body: "Abònman ou ekspire <strong>{date}</strong>. Aksè ou nan fonksyonalite jesyon yo restrenn kounye a. Re-abòne pou retabli aksè konplè.",
      cta: "Re-abòne Kounye a",
      footer: "Ou manke nou! Re-abòne pou retounen jere legliz ou.",
    },
  },
  renewal_success: {
    en: {
      subject: "✅ Subscription renewed successfully",
      title: "Subscription Renewed!",
      body: "Great news! Your subscription has been renewed. Your next billing date is <strong>{date}</strong>. Thank you for your continued trust.",
      cta: "Go to Dashboard",
      footer: "Thank you for choosing Church Management Pro.",
    },
    fr: {
      subject: "✅ Abonnement renouvelé avec succès",
      title: "Abonnement Renouvelé !",
      body: "Bonne nouvelle ! Votre abonnement a été renouvelé. Votre prochaine date de facturation est le <strong>{date}</strong>. Merci pour votre confiance continue.",
      cta: "Aller au Tableau de Bord",
      footer: "Merci d'avoir choisi Church Management Pro.",
    },
    ht: {
      subject: "✅ Abònman renouvle avèk siksè",
      title: "Abònman Renouvle!",
      body: "Bon nouvèl! Abònman ou renouvle. Pwochen dat faktirasyon ou se <strong>{date}</strong>. Mèsi pou konfyans kontinyèl ou.",
      cta: "Ale nan Tablo Bò",
      footer: "Mèsi paske ou chwazi Church Management Pro.",
    },
  },
  trial_expiring: {
    en: {
      subject: "🎁 Your free trial expires soon",
      title: "Your Free Trial Expires Soon",
      body: "Your free trial ends on <strong>{date}</strong>. Upgrade now to keep access to all your church management features without interruption.",
      cta: "Upgrade Now",
      footer: "Don't lose your data — upgrade before your trial expires.",
    },
    fr: {
      subject: "🎁 Votre essai gratuit expire bientôt",
      title: "Votre Essai Gratuit Expire Bientôt",
      body: "Votre essai gratuit se termine le <strong>{date}</strong>. Passez à un forfait payant maintenant pour conserver l'accès à toutes vos fonctionnalités de gestion d'église sans interruption.",
      cta: "Passer au Forfait Payant",
      footer: "Ne perdez pas vos données — passez à un forfait avant la fin de votre essai.",
    },
    ht: {
      subject: "🎁 Esè gratis ou prèske fini",
      title: "Esè Gratis Ou Prèske Fini",
      body: "Esè gratis ou ap fini <strong>{date}</strong>. Mete ajou kounye a pou kenbe aksè nan tout fonksyonalite jesyon legliz ou yo san entèripsyon.",
      cta: "Mete Ajou Kounye a",
      footer: "Pa pèdi done ou yo — mete ajou anvan esè ou fini.",
    },
  },
};

const colorSchemes: Record<AlertType, { bg: string; accent: string }> = {
  expiring_soon: { bg: "#D97706", accent: "#F59E0B" },
  expired: { bg: "#DC2626", accent: "#EF4444" },
  renewal_success: { bg: "#059669", accent: "#10B981" },
  trial_expiring: { bg: "#4F46E5", accent: "#6366F1" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[SUB-ALERTS] RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const resend = new Resend(resendApiKey);
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    let emailsSent = 0;

    // 1. Find subscriptions expiring in 3 or 7 days
    const { data: expiringSubs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, current_period_end, plan")
      .eq("status", "active")
      .not("current_period_end", "is", null);

    for (const sub of expiringSubs || []) {
      if (!sub.current_period_end) continue;
      const endDate = new Date(sub.current_period_end);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry !== 3 && daysUntilExpiry !== 7) continue;

      const emails = await getTenantAdminEmails(supabase, sub.tenant_id);
      if (emails.length === 0) continue;

      const lang = await getTenantLanguage(supabase, sub.tenant_id);
      const tenantName = await getTenantName(supabase, sub.tenant_id);
      const t = translations.expiring_soon[lang] || translations.expiring_soon.fr;
      const colors = colorSchemes.expiring_soon;
      const dateStr = formatDate(endDate, lang);

      await resend.emails.send({
        from: `${tenantName} <noreply@churchmanagementpro.com>`,
        to: emails,
        subject: `${t.subject} — ${tenantName}`,
        html: buildEmailHtml(t, colors, dateStr, tenantName),
      });
      emailsSent++;
    }

    // 2. Find subscriptions that just expired (cancelled status, check daily)
    const { data: expiredSubs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, current_period_end")
      .in("status", ["cancelled", "expired"]);

    for (const sub of expiredSubs || []) {
      if (!sub.current_period_end) continue;
      const endDate = new Date(sub.current_period_end);
      const daysSinceExpiry = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only send on day 1 and day 3 after expiry
      if (daysSinceExpiry !== 1 && daysSinceExpiry !== 3) continue;

      const emails = await getTenantAdminEmails(supabase, sub.tenant_id);
      if (emails.length === 0) continue;

      const lang = await getTenantLanguage(supabase, sub.tenant_id);
      const tenantName = await getTenantName(supabase, sub.tenant_id);
      const t = translations.expired[lang] || translations.expired.fr;
      const colors = colorSchemes.expired;
      const dateStr = formatDate(endDate, lang);

      await resend.emails.send({
        from: `${tenantName} <noreply@churchmanagementpro.com>`,
        to: emails,
        subject: `${t.subject} — ${tenantName}`,
        html: buildEmailHtml(t, colors, dateStr, tenantName),
      });
      emailsSent++;
    }

    // 3. Find trial subscriptions about to expire
    const { data: trialSubs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, trial_ends_at")
      .eq("status", "trial")
      .not("trial_ends_at", "is", null);

    for (const sub of trialSubs || []) {
      if (!sub.trial_ends_at) continue;
      const endDate = new Date(sub.trial_ends_at);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry !== 7 && daysUntilExpiry !== 3 && daysUntilExpiry !== 1) continue;

      const emails = await getTenantAdminEmails(supabase, sub.tenant_id);
      if (emails.length === 0) continue;

      const lang = await getTenantLanguage(supabase, sub.tenant_id);
      const tenantName = await getTenantName(supabase, sub.tenant_id);
      const t = translations.trial_expiring[lang] || translations.trial_expiring.fr;
      const colors = colorSchemes.trial_expiring;
      const dateStr = formatDate(endDate, lang);

      await resend.emails.send({
        from: `${tenantName} <noreply@churchmanagementpro.com>`,
        to: emails,
        subject: `${t.subject} — ${tenantName}`,
        html: buildEmailHtml(t, colors, dateStr, tenantName),
      });
      emailsSent++;
    }

    console.log(`[SUB-ALERTS] Processed. Emails sent: ${emailsSent}`);

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[SUB-ALERTS] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function getTenantAdminEmails(supabase: any, tenantId: string): Promise<string[]> {
  const { data: adminRoles } = await supabase
    .from("tenant_user_roles")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .eq("is_approved", true);

  const emails: string[] = [];
  for (const role of adminRoles || []) {
    const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
    if (userData?.user?.email) emails.push(userData.user.email);
  }
  return emails;
}

async function getTenantLanguage(supabase: any, tenantId: string): Promise<string> {
  const { data: adminRoles } = await supabase
    .from("tenant_user_roles")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("role", "admin")
    .eq("is_approved", true)
    .limit(1);

  if (adminRoles?.[0]) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", adminRoles[0].user_id)
      .single();
    if (profile?.language) return profile.language;
  }
  return "fr";
}

async function getTenantName(supabase: any, tenantId: string): Promise<string> {
  const { data } = await supabase.from("tenants").select("name").eq("id", tenantId).single();
  return data?.name || "Church Management Pro";
}

function formatDate(date: Date, lang: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const locale = lang === "fr" ? "fr-FR" : lang === "ht" ? "fr-HT" : "en-US";
  return date.toLocaleDateString(locale, opts);
}

function buildEmailHtml(
  t: { title: string; body: string; cta: string; footer: string },
  colors: { bg: string; accent: string },
  date: string,
  tenantName: string
): string {
  const bodyText = t.body.replace(/\{date\}/g, date);
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%); padding: 30px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${t.title}</h1>
        </div>
        <div style="padding: 30px;">
          <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">${bodyText}</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://cogmpw-sys.lovable.app/settings/subscription"
               style="display: inline-block; background: ${colors.bg}; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              ${t.cta}
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">${t.footer}</p>
        </div>
        <div style="background: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${tenantName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
