import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[UPDATE-TAX-EXEMPT] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

const REFUND_LOOKBACK_DAYS = 90;

const refundEmailTemplates: Record<string, { subject: string; heroTitle: string; intro: string; refundLabel: string; futureLabel: string; footer: string; cta: string }> = {
  en: {
    subject: "Your tax exemption was approved — refund issued",
    heroTitle: "Tax Exemption Approved ✅",
    intro: "Your tax-exempt certificate has been reviewed and approved. We've automatically refunded the sales tax charged on your recent invoice(s) to your original payment method.",
    refundLabel: "Total tax refunded",
    futureLabel: "Future invoices will not include sales tax. Refunds typically appear within 5–10 business days.",
    footer: "This email was sent automatically by",
    cta: "View your subscription",
  },
  fr: {
    subject: "Votre exonération fiscale a été approuvée — remboursement émis",
    heroTitle: "Exonération Fiscale Approuvée ✅",
    intro: "Votre certificat d'exonération fiscale a été examiné et approuvé. Nous avons automatiquement remboursé la taxe de vente facturée sur vos factures récentes sur votre moyen de paiement d'origine.",
    refundLabel: "Total taxe remboursée",
    futureLabel: "Les factures futures n'incluront pas de taxe de vente. Les remboursements apparaissent généralement sous 5 à 10 jours ouvrés.",
    footer: "Cet email a été envoyé automatiquement par",
    cta: "Voir mon abonnement",
  },
  ht: {
    subject: "Egzanpsyon taks ou apwouve — ranbousman fèt",
    heroTitle: "Egzanpsyon Taks Apwouve ✅",
    intro: "Sètifika egzanpsyon taks ou a egzaminen epi apwouve. Nou otomatikman ranbouse taks vant lan ki te chaje sou dènye fakti ou yo nan metòd peman orijinal ou.",
    refundLabel: "Total taks ranbouse",
    futureLabel: "Fakti k ap vini yo p ap gen taks vant. Ranbousman yo abityèlman parèt nan 5 a 10 jou ouvrab.",
    footer: "Imèl sa a te voye otomatikman pa",
    cta: "Wè abònman ou",
  },
};

async function sendRefundEmail(opts: {
  email: string;
  tenantName: string;
  totalRefunded: number;
  currency: string;
  language: string;
  refundCount: number;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    log("RESEND_API_KEY not configured — skipping email");
    return;
  }
  const t = refundEmailTemplates[opts.language] || refundEmailTemplates.en;
  const amount = `${opts.currency.toUpperCase()} ${opts.totalRefunded.toFixed(2)}`;
  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">⛪ ${opts.tenantName}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 18px;">${t.heroTitle}</p>
      </div>
      <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px;">${t.intro}</p>
        <div style="background: #ecfdf5; padding: 18px; border-radius: 8px; border: 1px solid #6ee7b7; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>${t.refundLabel}:</strong></p>
          <p style="margin: 6px 0 0; color: #065f46; font-size: 24px; font-weight: 700;">${amount}</p>
          <p style="margin: 6px 0 0; color: #065f46; font-size: 12px;">(${opts.refundCount} invoice${opts.refundCount > 1 ? "s" : ""})</p>
        </div>
        <p style="font-size: 14px; color: #4b5563;">${t.futureLabel}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://churchmanagementpro.com/settings/subscription" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">${t.cta}</a>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          ${t.footer} Church Management Pro.
        </p>
      </div>
    </body></html>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Church Management Pro <noreply@churchmanagementpro.com>`,
        to: [opts.email],
        subject: t.subject,
        html,
      }),
    });
    const j = await r.json();
    if (!r.ok) log("Refund email failed", j);
    else log("Refund email sent", { id: j.id });
  } catch (e) {
    log("Refund email exception", { e: String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(`Auth error: ${userErr.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("Not authenticated");

    const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSA) throw new Error("Unauthorized: super admin required");

    const body = await req.json();
    const { tenant_id, action, rejection_reason } = body as {
      tenant_id: string;
      action: "approve" | "reject" | "revoke";
      rejection_reason?: string;
    };
    if (!tenant_id || !action) throw new Error("Missing tenant_id or action");

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, contact_email")
      .eq("id", tenant_id)
      .single();
    if (!tenant) throw new Error("Tenant not found");

    let email = tenant.contact_email as string | null;
    if (!email) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .maybeSingle();
      email = prof?.email ?? null;
    }

    const { data: exemption } = await supabase
      .from("tenant_tax_exemptions")
      .select("id")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let refundTotal = 0;
    let refundCount = 0;
    let refundCurrency = "usd";

    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        const taxExempt = action === "approve" ? "exempt" : "none";
        await stripe.customers.update(customerId, { tax_exempt: taxExempt });
        log("Updated stripe customer", { id: customerId, taxExempt });

        if (action === "approve") {
          const sinceTs = Math.floor((Date.now() - REFUND_LOOKBACK_DAYS * 86400 * 1000) / 1000);
          const invoices = await stripe.invoices.list({
            customer: customerId,
            status: "paid",
            limit: 20,
            created: { gte: sinceTs },
          });
          log("Eligible paid invoices found", { count: invoices.data.length });

          for (const inv of invoices.data) {
            const taxCents = Number(inv.tax ?? 0);
            const paymentIntentId = (inv.payment_intent as string | null) ?? null;
            if (taxCents <= 0 || !paymentIntentId) continue;

            // Skip if already refunded for this invoice
            const { data: existing } = await supabase
              .from("tax_exemption_refunds")
              .select("id")
              .eq("stripe_invoice_id", inv.id)
              .maybeSingle();
            if (existing) {
              log("Invoice already refunded, skipping", { invoice: inv.id });
              continue;
            }

            try {
              const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: taxCents,
                reason: "requested_by_customer",
                metadata: {
                  type: "tax_exemption",
                  tenant_id,
                  invoice_id: inv.id,
                },
              });
              const amountDollars = taxCents / 100;
              refundTotal += amountDollars;
              refundCount += 1;
              refundCurrency = inv.currency || "usd";
              await supabase.from("tax_exemption_refunds").insert({
                tenant_id,
                tax_exemption_id: exemption?.id ?? null,
                stripe_invoice_id: inv.id,
                stripe_payment_intent_id: paymentIntentId,
                stripe_refund_id: refund.id,
                tax_amount_refunded: amountDollars,
                currency: refundCurrency,
                status: "succeeded",
              });
              log("Tax refund issued", { invoice: inv.id, amount: amountDollars, refund: refund.id });
            } catch (refundErr) {
              const msg = refundErr instanceof Error ? refundErr.message : String(refundErr);
              log("Refund failed for invoice", { invoice: inv.id, error: msg });
              await supabase.from("tax_exemption_refunds").insert({
                tenant_id,
                tax_exemption_id: exemption?.id ?? null,
                stripe_invoice_id: inv.id,
                stripe_payment_intent_id: paymentIntentId,
                tax_amount_refunded: taxCents / 100,
                currency: inv.currency || "usd",
                status: "failed",
                failure_reason: msg.slice(0, 500),
              });
            }
          }
        }
      } else {
        log("No Stripe customer yet — flag will apply on next checkout");
      }
    }

    const newStatus =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "none";
    const { error: upErr } = await supabase
      .from("tenant_tax_exemptions")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: action === "reject" ? rejection_reason ?? null : null,
      })
      .eq("tenant_id", tenant_id);
    if (upErr) throw upErr;

    if (action === "approve" && refundCount > 0 && email) {
      // Detect language from any user profile in tenant (default en)
      const { data: prof } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .maybeSingle();
      const language = (prof as any)?.preferred_language || "en";
      await sendRefundEmail({
        email,
        tenantName: tenant.name,
        totalRefunded: refundTotal,
        currency: refundCurrency,
        language,
        refundCount,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: newStatus,
        refund_total: refundTotal,
        refund_count: refundCount,
        currency: refundCurrency,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
