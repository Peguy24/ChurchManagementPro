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
  "prod_Tqetfpt7pnhNFf": "essentiel",
  "prod_TqetHNAL0zc5kD": "professionnel",
  "prod_TqeuZk0jVNwjEp": "entreprise",
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

async function notifyTenantAdmins(eventType: string, tenantId: string, amount?: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-tenant-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ eventType, tenantId, amount, language: "fr" }),
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

        if (planKey) {
          await syncSubscription(supabase, tenantId, planKey, status, periodEnd);
          const tenantName = await getTenantName(supabase, tenantId);
          await notifySuperAdmin("plan_updated", { tenantName, tenantEmail: email, newPlan: planKey });
        }

        logStep("Subscription updated processed", { email, planKey, status });
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
        const email = invoice.customer_email;

        if (!email) break;

        const tenantId = await getTenantByEmail(supabase, email);
        if (!tenantId) break;

        // Update status to past_due
        await supabase
          .from("tenant_subscriptions")
          .update({ status: "past_due" })
          .eq("tenant_id", tenantId);

        const tenantName = await getTenantName(supabase, tenantId);
        await notifySuperAdmin("payment_failed", {
          tenantName,
          tenantEmail: email,
          amount: invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "unknown",
        });

        // Create tenant notification
        await supabase.from("tenant_notifications").insert({
          tenant_id: tenantId,
          notification_type: "payment_failed",
          severity: "error",
          title: "Échec de paiement",
          message: "Votre paiement a échoué. Veuillez mettre à jour votre méthode de paiement.",
          metadata: { invoice_id: invoice.id },
        });

        const amountStr = invoice.amount_due ? (invoice.amount_due / 100).toFixed(2) : "0";
        await notifyTenantAdmins("payment_failed", tenantId, amountStr);

        logStep("Payment failed processed", { email });
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
