import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Product IDs mapping to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  // Monthly products
  "prod_UTf3WP0cKpe9nL": "essentiel",
  "prod_UTf4OlDmzUl7gM": "professionnel",
  "prod_UTf4SPRIVqmMpJ": "entreprise",
  // Yearly products
  "prod_UA271d9Xzge6lN": "essentiel",
  "prod_UA2716VZhzrvjd": "professionnel",
  "prod_UA28jB4cFz2aZ7": "entreprise",
};

// Map plan names to DB plan names
const PLAN_TO_DB: Record<string, { plan: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  "essentiel": { plan: "basic", price: 29.99, members: 200, branches: 1, users: 5, storage: 500 },
  "professionnel": { plan: "standard", price: 59.99, members: 1000, branches: 3, users: 15, storage: 2000 },
  "entreprise": { plan: "premium", price: 99.99, members: -1, branches: -1, users: -1, storage: -1 },
};

const getSupabaseClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

async function getTenantByEmail(supabase: ReturnType<typeof getSupabaseClient>, email: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  return profile?.tenant_id || null;
}

async function getTenantName(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string) {
  const { data } = await supabase.from("tenants").select("name").eq("id", tenantId).single();
  return data?.name || "Unknown";
}

async function syncSubscription(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  planKey: string,
  status: string,
  periodEnd: string | null
) {
  const dbPlan = PLAN_TO_DB[planKey];
  if (!dbPlan) {
    logStep("Unknown plan key, skipping sync", { planKey });
    return;
  }

  const { error } = await supabase
    .from("tenant_subscriptions")
    .update({
      plan: dbPlan.plan,
      status,
      price_monthly: dbPlan.price,
      max_members: dbPlan.members,
      max_branches: dbPlan.branches,
      max_users: dbPlan.users,
      max_storage_mb: dbPlan.storage,
      current_period_end: periodEnd,
      ...(status === "active" ? { trial_ends_at: null } : {}),
    })
    .eq("tenant_id", tenantId);

  if (error) {
    logStep("Failed to sync subscription", { error: error.message });
  } else {
    logStep("Subscription synced", { tenantId, plan: dbPlan.plan, status });
  }
}

async function notifySuperAdmin(eventType: string, details: Record<string, unknown>) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-superadmin-subscription-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ eventType, ...details, language: "en" }),
    });
  } catch (e) {
    logStep("Failed to notify super admin", { error: String(e) });
  }
}

async function getTenantLanguage(supabase: ReturnType<typeof getSupabaseClient>, tenantId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("tenants")
      .select("preferred_language, language")
      .eq("id", tenantId)
      .maybeSingle();
    const lang = (data as any)?.preferred_language || (data as any)?.language;
    return ["en", "fr", "ht"].includes(lang) ? lang : "fr";
  } catch {
    return "fr";
  }
}

async function notifyTenantAdmins(
  eventType: string,
  tenantId: string,
  amount?: string,
  extra?: { planName?: string; billingUrl?: string; language?: string },
) {
  try {
    const supabase = getSupabaseClient();
    const language = extra?.language || (await getTenantLanguage(supabase, tenantId));
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-tenant-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        eventType,
        tenantId,
        amount,
        language,
        planName: extra?.planName,
        billingUrl: extra?.billingUrl || "https://cogmpw-sys.lovable.app/settings/subscription",
      }),
    });
  } catch (e) {
    logStep("Failed to notify tenant admins", { error: String(e) });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response(`Webhook signature verification failed: ${String(err)}`, { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabase = getSupabaseClient();

    switch (event.type) {
      // ─── Subscription updated (plan change, renewal, status change) ───
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (!email) {
          logStep("No email on customer", { customerId });
          break;
        }

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) {
          logStep("No tenant found for email", { email });
          break;
        }

        const productId = subscription.items.data[0]?.price?.product as string;
        const planKey = PRODUCT_TO_PLAN[productId] || null;
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const status = subscription.status === "trialing" ? "trialing" : subscription.status === "active" ? "active" : subscription.status;

        // Detect plan change: previous_attributes contains items if plan changed
        const previousAttrs = (event.data as any).previous_attributes || {};
        const planChanged = event.type === "customer.subscription.updated"
          && (previousAttrs.items || previousAttrs.plan);

        if (planKey) {
          await syncSubscription(supabase, tenantId, planKey, status, periodEnd);
          const tenantName = await getTenantName(supabase, tenantId);
          await notifySuperAdmin("plan_updated", { tenantName, tenantEmail: email, newPlan: planKey });

          if (planChanged) {
            const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1);
            await notifyTenantAdmins("plan_changed", tenantId, planName);
            await supabase.from("tenant_notifications").insert({
              tenant_id: tenantId,
              notification_type: "plan_changed",
              severity: "info",
              title: "Forfait mis à jour",
              message: `Votre abonnement est désormais sur le forfait ${planName}. Les nouvelles fonctionnalités sont disponibles immédiatement.`,
              metadata: { plan: planKey, subscription_id: subscription.id },
            });
            logStep("Plan change notification sent", { email, planKey });
          }
        }

        logStep("Subscription updated processed", { email, planKey, status, planChanged });
        break;
      }

      // ─── Payment method updated via Customer Portal ───
      case "payment_method.attached":
      case "customer.updated": {
        // For customer.updated, only act if default payment method changed
        if (event.type === "customer.updated") {
          const prev = (event.data as any).previous_attributes || {};
          const invoiceSettingsChanged = prev.invoice_settings
            && Object.prototype.hasOwnProperty.call(prev.invoice_settings, "default_payment_method");
          if (!invoiceSettingsChanged) break;
        }

        const obj = event.data.object as any;
        const customerId = (obj.customer || obj.id) as string;
        if (!customerId) break;

        let email: string | null = null;
        try {
          const customer = await stripe.customers.retrieve(customerId);
          email = (customer as Stripe.Customer).email || null;
        } catch (e) {
          logStep("Could not retrieve customer for PM update", { error: String(e) });
          break;
        }
        if (!email) break;

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) break;

        await notifyTenantAdmins("payment_method_updated", tenantId);
        await supabase.from("tenant_notifications").insert({
          tenant_id: tenantId,
          notification_type: "payment_method_updated",
          severity: "info",
          title: "Méthode de paiement mise à jour",
          message: "Votre méthode de paiement de facturation a été mise à jour avec succès. Les prochains prélèvements utiliseront cette nouvelle méthode. Si vous n'êtes pas à l'origine de ce changement, contactez le support immédiatement.",
          metadata: { customer_id: customerId },
        });

        logStep("Payment method updated notification sent", { email });
        break;
      }

      // ─── Subscription deleted (cancelled) ───
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (!email) break;

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) break;

        // Mark subscription as cancelled
        await supabase
          .from("tenant_subscriptions")
          .update({ status: "cancelled" })
          .eq("tenant_id", tenantId);

        const tenantName = await getTenantName(supabase, tenantId);
        await notifySuperAdmin("plan_cancelled", { tenantName, tenantEmail: email });
        await notifyTenantAdmins("subscription_cancelled", tenantId);

        logStep("Subscription cancelled", { email, tenantId });
        break;
      }

      // ─── Invoice payment failed ───
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email
          || (invoice.customer ? ((await stripe.customers.retrieve(invoice.customer as string)) as Stripe.Customer).email : null);

        if (!email) {
          logStep("No email on failed invoice", { invoiceId: invoice.id });
          break;
        }

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) {
          logStep("No tenant for failed invoice", { email });
          break;
        }

        // Update status to past_due
        await supabase
          .from("tenant_subscriptions")
          .update({ status: "past_due" })
          .eq("tenant_id", tenantId);

        const amountStr = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0";
        const currency = (invoice.currency || "usd").toUpperCase();
        const attemptCount = invoice.attempt_count ?? 1;
        const nextAttemptISO = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : null;
        const hostedInvoiceUrl = invoice.hosted_invoice_url || null;

        const tenantName = await getTenantName(supabase, tenantId);
        await notifySuperAdmin("payment_failed", {
          tenantName,
          tenantEmail: email,
          amount: amountStr,
        });

        // Create rich in-app notification with next steps
        const nextRetryStr = nextAttemptISO
          ? new Date(nextAttemptISO).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
          : null;
        const inAppMessage = [
          `Votre paiement de ${amountStr} ${currency} a échoué (tentative ${attemptCount}).`,
          `Prochaines étapes :`,
          `1. Mettez à jour votre méthode de paiement dans Paramètres → Abonnement.`,
          `2. Vérifiez que votre carte n'est pas expirée et dispose de fonds suffisants.`,
          nextRetryStr ? `3. Stripe réessaiera automatiquement le ${nextRetryStr}.` : `3. Mettez à jour votre paiement pour relancer la facturation.`,
          `Sans action, votre accès sera suspendu après plusieurs tentatives échouées.`,
        ].join("\n");

        await supabase.from("tenant_notifications").insert({
          tenant_id: tenantId,
          notification_type: "payment_failed",
          severity: "error",
          title: "Échec de paiement — Action requise",
          message: inAppMessage,
          metadata: {
            invoice_id: invoice.id,
            amount: amountStr,
            currency,
            attempt_count: attemptCount,
            next_payment_attempt: nextAttemptISO,
            hosted_invoice_url: hostedInvoiceUrl,
          },
        });

        await notifyTenantAdmins("payment_failed", tenantId, amountStr);

        logStep("Payment failed processed", { email, attemptCount, nextAttemptISO });
        break;
      }

      // ─── Invoice payment succeeded ───
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email;

        if (!email) break;

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) break;

        // Clear any past_due status — the subscription.updated event handles the rest
        const { data: currentSub } = await supabase
          .from("tenant_subscriptions")
          .select("status")
          .eq("tenant_id", tenantId)
          .single();

        if (currentSub?.status === "past_due") {
          await supabase
            .from("tenant_subscriptions")
            .update({ status: "active" })
            .eq("tenant_id", tenantId);
        }

        const tenantName = await getTenantName(supabase, tenantId);
        await notifySuperAdmin("payment_succeeded", {
          tenantName,
          tenantEmail: email,
          amount: invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : "0",
        });

        const paidAmount = invoice.amount_paid ? (invoice.amount_paid / 100).toFixed(2) : "0";
        await notifyTenantAdmins("payment_succeeded", tenantId, paidAmount);

        // Trigger referral qualification (only acts if tenant was referred and not already processed)
        try {
          await supabase.functions.invoke("qualify-referral", {
            body: { referredTenantId: tenantId, source: "stripe_webhook" },
          });
        } catch (refErr) {
          logStep("Referral qualification skipped", { error: String(refErr) });
        }

        logStep("Payment succeeded processed", { email });
        break;
      }

      // ─── Checkout session completed ───
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_email || session.customer_details?.email;

        if (!email) break;

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) break;

        // If subscription mode, the subscription.created/updated event handles sync
        // Just notify super admin
        const tenantName = await getTenantName(supabase, tenantId);
        await notifySuperAdmin("checkout_completed", { tenantName, tenantEmail: email });

        logStep("Checkout completed", { email, tenantId });
        break;
      }

      // ─── Tax-exemption refund lifecycle ───
      case "refund.created":
      case "refund.updated":
      case "charge.refund.updated":
      case "refund.failed": {
        const refund = event.data.object as Stripe.Refund;
        const refundId = refund.id;

        // Map Stripe refund status to our DB status
        let dbStatus: string;
        let failureReason: string | null = null;
        switch (refund.status) {
          case "succeeded":
            dbStatus = "succeeded";
            break;
          case "failed":
          case "canceled":
            dbStatus = "failed";
            failureReason = refund.failure_reason || refund.status || null;
            break;
          case "pending":
          case "requires_action":
          default:
            dbStatus = "pending";
        }

        // Locate our row by stripe_refund_id (preferred) or fallback to invoice/payment_intent
        const { data: existing } = await supabase
          .from("tax_exemption_refunds")
          .select("id, tenant_id, status")
          .eq("stripe_refund_id", refundId)
          .maybeSingle();

        if (!existing) {
          logStep("Refund not tracked in tax_exemption_refunds (likely unrelated)", { refundId });
          break;
        }

        if (existing.status === dbStatus) {
          logStep("Refund status unchanged, skipping", { refundId, status: dbStatus });
          break;
        }

        const { error: updErr } = await supabase
          .from("tax_exemption_refunds")
          .update({
            status: dbStatus,
            failure_reason: failureReason,
          })
          .eq("id", existing.id);

        if (updErr) {
          logStep("Failed to update tax refund row", { error: updErr.message });
        } else {
          logStep("Tax refund status synced", { refundId, dbStatus });
        }

        // Notify tenant + super admin on terminal states
        if (dbStatus === "failed") {
          const tenantName = await getTenantName(supabase, existing.tenant_id);
          const amountStr = refund.amount ? (refund.amount / 100).toFixed(2) : "0";

          await supabase.from("tenant_notifications").insert({
            tenant_id: existing.tenant_id,
            notification_type: "tax_refund_failed",
            severity: "error",
            title: "Tax refund failed",
            message: `amount:${amountStr}|reason:${failureReason || "unknown"}`,
            metadata: { refund_id: refundId, reason: failureReason },
          });

          await notifySuperAdmin("tax_refund_failed", {
            tenantName,
            tenantEmail: "",
            amount: amountStr,
          });
        } else if (dbStatus === "succeeded") {
          await supabase.from("tenant_notifications").insert({
            tenant_id: existing.tenant_id,
            notification_type: "tax_refund_succeeded",
            severity: "info",
            title: "Tax refund completed",
            message: `amount:${refund.amount ? (refund.amount / 100).toFixed(2) : "0"}`,
            metadata: { refund_id: refundId },
          });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
