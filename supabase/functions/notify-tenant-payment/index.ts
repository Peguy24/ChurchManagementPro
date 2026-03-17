import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PaymentEvent = "payment_succeeded" | "payment_failed" | "subscription_cancelled";

const translations: Record<PaymentEvent, Record<string, { subject: string; title: string; body: string; cta: string; footer: string }>> = {
  payment_succeeded: {
    en: {
      subject: "✅ Payment Confirmed",
      title: "Payment Successfully Processed",
      body: "Your payment of <strong>${amount}</strong> has been successfully processed. Your subscription remains active.",
      cta: "View Subscription",
      footer: "Thank you for your continued support.",
    },
    fr: {
      subject: "✅ Paiement Confirmé",
      title: "Paiement Traité avec Succès",
      body: "Votre paiement de <strong>{amount} $</strong> a été traité avec succès. Votre abonnement reste actif.",
      cta: "Voir l'abonnement",
      footer: "Merci pour votre soutien continu.",
    },
    ht: {
      subject: "✅ Peman Konfime",
      title: "Peman Trete ak Siksè",
      body: "Peman ou de <strong>${amount}</strong> trete ak siksè. Abònman ou rete aktif.",
      cta: "Wè abònman",
      footer: "Mèsi pou sipò kontinyèl ou.",
    },
  },
  payment_failed: {
    en: {
      subject: "⚠️ Payment Failed",
      title: "Payment Could Not Be Processed",
      body: "We were unable to process your payment of <strong>${amount}</strong>. Please update your payment method to avoid service interruption.",
      cta: "Update Payment Method",
      footer: "If you need assistance, please contact our support team.",
    },
    fr: {
      subject: "⚠️ Échec de Paiement",
      title: "Le Paiement n'a Pas Pu Être Traité",
      body: "Nous n'avons pas pu traiter votre paiement de <strong>{amount} $</strong>. Veuillez mettre à jour votre méthode de paiement pour éviter une interruption de service.",
      cta: "Mettre à jour le paiement",
      footer: "Si vous avez besoin d'aide, contactez notre équipe de support.",
    },
    ht: {
      subject: "⚠️ Peman Echwe",
      title: "Peman Pa t Kapab Trete",
      body: "Nou pa t kapab trete peman ou de <strong>${amount}</strong>. Tanpri mete ajou metòd peman ou pou evite entèripsyon sèvis.",
      cta: "Mete ajou peman",
      footer: "Si ou bezwen èd, kontakte ekip sipò nou.",
    },
  },
  subscription_cancelled: {
    en: {
      subject: "🔔 Subscription Cancelled",
      title: "Your Subscription Has Been Cancelled",
      body: "Your subscription has been cancelled. You can continue using the service until the end of your current billing period. You can resubscribe at any time.",
      cta: "Resubscribe",
      footer: "We're sorry to see you go. If you change your mind, we're here for you.",
    },
    fr: {
      subject: "🔔 Abonnement Annulé",
      title: "Votre Abonnement a Été Annulé",
      body: "Votre abonnement a été annulé. Vous pouvez continuer à utiliser le service jusqu'à la fin de votre période de facturation en cours. Vous pouvez vous réabonner à tout moment.",
      cta: "Se réabonner",
      footer: "Nous sommes désolés de vous voir partir. Si vous changez d'avis, nous sommes là pour vous.",
    },
    ht: {
      subject: "🔔 Abònman Anile",
      title: "Abònman Ou Anile",
      body: "Abònman ou anile. Ou ka kontinye itilize sèvis la jiska fen peryòd faktirasyon aktyèl ou. Ou ka re-abòne nenpòt lè.",
      cta: "Re-abòne",
      footer: "Nou regrèt wè ou ale. Si ou chanje lide, nou la pou ou.",
    },
  },
};

const colorSchemes: Record<PaymentEvent, { bg: string; accent: string }> = {
  payment_succeeded: { bg: "#059669", accent: "#10B981" },
  payment_failed: { bg: "#DC2626", accent: "#EF4444" },
  subscription_cancelled: { bg: "#6B7280", accent: "#9CA3AF" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventType, tenantId, amount, language = "fr" } = await req.json() as {
      eventType: PaymentEvent;
      tenantId: string;
      amount?: string;
      language?: string;
    };

    if (!eventType || !tenantId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const lang = ["en", "fr", "ht"].includes(language) ? language : "fr";
    const t = translations[eventType]?.[lang] || translations[eventType]?.fr;
    if (!t) {
      return new Response(JSON.stringify({ error: "Invalid event type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get tenant name
    const { data: tenant } = await supabase.from("tenants").select("name").eq("id", tenantId).single();
    const tenantName = tenant?.name || "Church Management Pro";

    // Get all admin emails for this tenant
    const { data: adminRoles } = await supabase
      .from("tenant_user_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_approved", true);

    const adminEmails: string[] = [];
    for (const role of adminRoles || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(role.user_id);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("[NOTIFY-TENANT-PAYMENT] No admin emails found for tenant", tenantId);
      return new Response(JSON.stringify({ success: true, sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[NOTIFY-TENANT-PAYMENT] RESEND_API_KEY not set");
      return new Response(JSON.stringify({ success: false, error: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const colors = colorSchemes[eventType];
    const bodyText = t.body.replace(/\{amount\}/g, amount || "0").replace(/\$\{amount\}/g, amount || "0");

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: `${tenantName} <noreply@churchmanagementpro.com>`,
      to: adminEmails,
      subject: `${t.subject} — ${tenantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${t.title}</h1>
            </div>
            <div style="padding: 30px;">
              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                ${bodyText}
              </p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="https://cogmpw-sys.lovable.app/settings/subscription"
                   style="display: inline-block; background: ${colors.bg}; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  ${t.cta}
                </a>
              </div>
              <p style="color: #6b7280; font-size: 13px; text-align: center; margin: 20px 0 0 0;">
                ${t.footer}
              </p>
            </div>
            <div style="background: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Church Management Pro
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[NOTIFY-TENANT-PAYMENT] ${eventType} email sent to ${adminEmails.length} admins for tenant ${tenantId}`);

    return new Response(JSON.stringify({ success: true, sent: true, recipients: adminEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[NOTIFY-TENANT-PAYMENT] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
