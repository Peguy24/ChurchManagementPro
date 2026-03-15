import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventType = "plan_updated" | "plan_cancelled" | "plan_expired" | "plan_renewed" | "payment_failed" | "payment_succeeded" | "checkout_completed";

const translations: Record<string, Record<string, Record<string, string>>> = {
  plan_updated: {
    en: {
      subject: "📊 Plan Updated",
      title: "Subscription Plan Changed",
      subtitle: "A tenant has changed their subscription plan",
      label: "Plan Change Details",
      action: "Plan Updated",
    },
    fr: {
      subject: "📊 Plan Mis à Jour",
      title: "Changement de Plan d'Abonnement",
      subtitle: "Un tenant a changé son plan d'abonnement",
      label: "Détails du Changement",
      action: "Plan Mis à Jour",
    },
    ht: {
      subject: "📊 Plan Mete Ajou",
      title: "Chanjman Plan Abònman",
      subtitle: "Yon tenant chanje plan abònman li",
      label: "Detay Chanjman an",
      action: "Plan Mete Ajou",
    },
  },
  plan_cancelled: {
    en: {
      subject: "🚫 Plan Cancelled",
      title: "Subscription Cancelled",
      subtitle: "A tenant has cancelled their subscription",
      label: "Cancellation Details",
      action: "Plan Cancelled",
    },
    fr: {
      subject: "🚫 Plan Annulé",
      title: "Abonnement Annulé",
      subtitle: "Un tenant a annulé son abonnement",
      label: "Détails de l'Annulation",
      action: "Plan Annulé",
    },
    ht: {
      subject: "🚫 Plan Anile",
      title: "Abònman Anile",
      subtitle: "Yon tenant anile abònman li",
      label: "Detay Anilasyon an",
      action: "Plan Anile",
    },
  },
  plan_expired: {
    en: {
      subject: "⏰ Plan Expired",
      title: "Subscription Expired",
      subtitle: "A tenant's subscription has expired",
      label: "Expiration Details",
      action: "Plan Expired",
    },
    fr: {
      subject: "⏰ Plan Expiré",
      title: "Abonnement Expiré",
      subtitle: "L'abonnement d'un tenant a expiré",
      label: "Détails de l'Expiration",
      action: "Plan Expiré",
    },
    ht: {
      subject: "⏰ Plan Ekspire",
      title: "Abònman Ekspire",
      subtitle: "Abònman yon tenant ekspire",
      label: "Detay Ekspirasyon an",
      action: "Plan Ekspire",
    },
  },
  plan_renewed: {
    en: {
      subject: "✅ Plan Renewed",
      title: "Subscription Renewed",
      subtitle: "A tenant has renewed their subscription",
      label: "Renewal Details",
      action: "Plan Renewed",
    },
    fr: {
      subject: "✅ Plan Renouvelé",
      title: "Abonnement Renouvelé",
      subtitle: "Un tenant a renouvelé son abonnement",
      label: "Détails du Renouvellement",
      action: "Plan Renouvelé",
    },
    ht: {
      subject: "✅ Plan Renouvle",
      title: "Abònman Renouvle",
      subtitle: "Yon tenant renouvle abònman li",
      label: "Detay Renouvèlman an",
      action: "Plan Renouvle",
    },
  },
  payment_failed: {
    en: { subject: "⚠️ Payment Failed", title: "Payment Failed", subtitle: "A tenant's payment could not be processed", label: "Payment Details", action: "Payment Failed" },
    fr: { subject: "⚠️ Paiement Échoué", title: "Paiement Échoué", subtitle: "Le paiement d'un tenant n'a pas pu être traité", label: "Détails du Paiement", action: "Paiement Échoué" },
    ht: { subject: "⚠️ Peman Echwe", title: "Peman Echwe", subtitle: "Peman yon tenant pa t kapab trete", label: "Detay Peman", action: "Peman Echwe" },
  },
  payment_succeeded: {
    en: { subject: "💰 Payment Received", title: "Payment Received", subtitle: "A tenant's payment was successfully processed", label: "Payment Details", action: "Payment Received" },
    fr: { subject: "💰 Paiement Reçu", title: "Paiement Reçu", subtitle: "Le paiement d'un tenant a été traité avec succès", label: "Détails du Paiement", action: "Paiement Reçu" },
    ht: { subject: "💰 Peman Resevwa", title: "Peman Resevwa", subtitle: "Peman yon tenant trete ak siksè", label: "Detay Peman", action: "Peman Resevwa" },
  },
  checkout_completed: {
    en: { subject: "🛒 Checkout Completed", title: "New Checkout", subtitle: "A tenant has completed a checkout session", label: "Checkout Details", action: "Checkout Completed" },
    fr: { subject: "🛒 Paiement Complété", title: "Nouveau Paiement", subtitle: "Un tenant a complété une session de paiement", label: "Détails du Paiement", action: "Paiement Complété" },
    ht: { subject: "🛒 Peman Konplete", title: "Nouvo Peman", subtitle: "Yon tenant konplete yon sesyon peman", label: "Detay Peman", action: "Peman Konplete" },
  },
};

const colorSchemes: Record<EventType, { bg: string; accent: string }> = {
  plan_updated: { bg: "#1E40AF", accent: "#3B82F6" },
  plan_cancelled: { bg: "#DC2626", accent: "#EF4444" },
  plan_expired: { bg: "#D97706", accent: "#F59E0B" },
  plan_renewed: { bg: "#059669", accent: "#10B981" },
};

const PLAN_LABELS: Record<string, string> = {
  basic: "Essential",
  essentiel: "Essential",
  standard: "Professional",
  professionnel: "Professional",
  premium: "Enterprise",
  entreprise: "Enterprise",
  free: "Free",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const {
      eventType,
      tenantName,
      tenantEmail,
      previousPlan,
      newPlan,
      language = "en",
    } = await req.json() as {
      eventType: EventType;
      tenantName: string;
      tenantEmail: string;
      previousPlan?: string;
      newPlan?: string;
      language?: string;
    };

    if (!eventType || !tenantName || !tenantEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const lang = ["en", "fr", "ht"].includes(language) ? language : "en";
    const t = translations[eventType]?.[lang] || translations[eventType]?.en;
    if (!t) {
      return new Response(JSON.stringify({ error: "Invalid event type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const colors = colorSchemes[eventType];

    // Get super admin emails
    const { data: platformAdmins } = await supabase
      .from("platform_user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    const superAdminEmails: string[] = [];
    for (const admin of platformAdmins || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
      if (userData?.user?.email) {
        superAdminEmails.push(userData.user.email);
      }
    }

    if (superAdminEmails.length === 0) {
      console.log("[NOTIFY-SUPERADMIN] No super admin emails found");
      return new Response(JSON.stringify({ success: true, sent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prevLabel = previousPlan ? (PLAN_LABELS[previousPlan] || previousPlan) : "-";
    const newLabel = newPlan ? (PLAN_LABELS[newPlan] || newPlan) : "-";

    const planInfo = eventType === "plan_updated"
      ? `<p style="margin: 0 0 8px 0;"><strong>${lang === "fr" ? "Ancien plan" : lang === "ht" ? "Ansyen plan" : "Previous Plan"}:</strong> ${prevLabel}</p>
         <p style="margin: 0 0 8px 0;"><strong>${lang === "fr" ? "Nouveau plan" : lang === "ht" ? "Nouvo plan" : "New Plan"}:</strong> ${newLabel}</p>`
      : `<p style="margin: 0 0 8px 0;"><strong>Plan:</strong> ${prevLabel || newLabel}</p>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[NOTIFY-SUPERADMIN] RESEND_API_KEY not set");
      return new Response(JSON.stringify({ success: false, error: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Church Manager Pro <noreply@churchmanagementpro.com>",
      to: superAdminEmails,
      subject: `${t.subject}: ${tenantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.accent} 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${t.title}</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">${t.subtitle}</p>
            </div>
            <div style="padding: 30px;">
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #334155;">${t.label}</h2>
                <p style="margin: 0 0 8px 0;"><strong>${lang === "fr" ? "Église" : lang === "ht" ? "Legliz" : "Church"}:</strong> ${tenantName}</p>
                <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${tenantEmail}</p>
                ${planInfo}
                <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border: 1px solid #bfdbfe; text-align: center;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  🔔 ${t.action}
                </p>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin-top: 20px; text-align: center;">
                ${lang === "fr" ? "Notification automatique de Church Manager Pro." : lang === "ht" ? "Notifikasyon otomatik Church Manager Pro." : "Automated notification from Church Manager Pro."}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[NOTIFY-SUPERADMIN] ${eventType} email sent to ${superAdminEmails.length} admins`);

    return new Response(JSON.stringify({ success: true, sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[NOTIFY-SUPERADMIN] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
