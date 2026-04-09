import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

// Map plan names to DB plan names for tenant_subscriptions sync
const PLAN_TO_DB: Record<string, { plan: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  "essentiel": { plan: "basic", price: 29.99, members: 200, branches: 1, users: 5, storage: 500 },
  "professionnel": { plan: "standard", price: 59.99, members: 1000, branches: 3, users: 15, storage: 2000 },
  "entreprise": { plan: "premium", price: 99.99, members: -1, branches: -1, users: -1, storage: -1 },
};

const DB_TO_PLAN: Record<string, string> = {
  "basic": "essentiel",
  "standard": "professionnel",
  "premium": "entreprise",
  "free": "free",
};

const isDbTrialStatus = (status: string | null | undefined) => status === "trial" || status === "trialing";
const isDbSubscribedStatus = (status: string | null | undefined) => status === "active" || isDbTrialStatus(status);
const getDbSubscriptionEnd = (
  subscription?: { status?: string | null; trial_ends_at?: string | null; current_period_end?: string | null } | null,
) => (isDbTrialStatus(subscription?.status) ? subscription?.trial_ends_at ?? null : subscription?.current_period_end ?? null);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    let userId: string;
    let userEmail: string;
    
    try {
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError || !userData?.user) {
        logStep("Auth failed", { error: userError?.message });
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
      userId = userData.user.id;
      userEmail = userData.user.email ?? "";
    } catch (authErr) {
      logStep("Auth exception", { error: String(authErr) });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!userId || !userEmail) {
      return new Response(JSON.stringify({ error: "Invalid token claims" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    logStep("User authenticated", { userId, email: userEmail });

    // Get user's tenant_id first (needed for DB fallback)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    const userTenantId = profile?.tenant_id;

    const { data: tenantSub } = userTenantId
      ? await supabaseClient
          .from("tenant_subscriptions")
          .select("plan, status, current_period_end, trial_ends_at")
          .eq("tenant_id", userTenantId)
          .maybeSingle()
      : { data: null };

    logStep("User tenant", {
      tenantId: userTenantId,
      tenantStatus: tenantSub?.status,
      tenantPlan: tenantSub?.plan,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer for this user, checking tenant subscription in DB");

      if (tenantSub && isDbSubscribedStatus(tenantSub.status) && tenantSub.plan) {
        const mappedPlan = DB_TO_PLAN[tenantSub.plan] || tenantSub.plan;
        const subscriptionEnd = getDbSubscriptionEnd(tenantSub);

        // Safety check: if DB-only subscription has expired period, mark as expired
        if (subscriptionEnd && new Date(subscriptionEnd) < new Date()) {
          logStep("DB-only subscription period has ended, marking as expired", {
            subscriptionEnd,
            tenantId: userTenantId,
          });

          await supabaseClient
            .from("tenant_subscriptions")
            .update({ status: "expired" })
            .eq("tenant_id", userTenantId);

          return new Response(JSON.stringify({
            subscribed: false,
            plan: null,
            status: "expired",
            subscription_end: subscriptionEnd,
            has_stripe_customer: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        logStep("Found tenant subscription in DB", {
          plan: mappedPlan,
          status: tenantSub.status,
          subscriptionEnd,
        });

        return new Response(JSON.stringify({
          subscribed: true,
          plan: mappedPlan,
          status: tenantSub.status,
          subscription_end: subscriptionEnd,
          has_stripe_customer: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({
        subscribed: false,
        plan: null,
        status: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get active or trialing subscriptions
    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // If no active, check for trialing
    if (subscriptions.data.length === 0) {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        logStep("Found trialing subscription");
      }
    }

    const hasActiveSub = subscriptions.data.length > 0;
    let plan: string | null = null;
    let subscriptionEnd: string | null = null;
    let subscriptionStatus: string | null = null;

    // Get previous DB state for change detection
    let previousDbStatus: string | null = null;
    let previousDbPlan: string | null = null;
    let tenantName = "Unknown";
    if (userTenantId) {
      const { data: prevSub } = await supabaseClient
        .from("tenant_subscriptions")
        .select("status, plan")
        .eq("tenant_id", userTenantId)
        .single();
      previousDbStatus = prevSub?.status || null;
      previousDbPlan = prevSub?.plan || null;

      const { data: tenant } = await supabaseClient
        .from("tenants")
        .select("name")
        .eq("id", userTenantId)
        .single();
      tenantName = tenant?.name || "Unknown";
    }

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionStatus = subscription.status === "trialing" ? "trial" : "active";

      // Get the product ID to determine the plan
      const productId = subscription.items.data[0].price.product as string;
      plan = PRODUCT_TO_PLAN[productId] || null;

      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        endDate: subscriptionEnd,
        productId,
        plan,
        status: subscriptionStatus,
      });

      // Sync plan to tenant_subscriptions in database
      if (plan) {
        const dbPlan = PLAN_TO_DB[plan];
        if (dbPlan && userTenantId) {
          const { error: syncError } = await supabaseClient
            .from("tenant_subscriptions")
            .update({
              plan: dbPlan.plan,
              status: subscriptionStatus === "trial" ? "trial" : "active",
              price_monthly: dbPlan.price,
              max_members: dbPlan.members,
              max_branches: dbPlan.branches,
              max_users: dbPlan.users,
              max_storage_mb: dbPlan.storage,
              current_period_end: subscriptionEnd,
              trial_ends_at: subscriptionStatus === "trial" ? subscriptionEnd : null,
            })
            .eq("tenant_id", userTenantId);

          if (syncError) {
            logStep("Failed to sync plan to DB", { error: syncError.message });
          } else {
            logStep("Plan synced to tenant_subscriptions", { tenantId: userTenantId, dbPlan: dbPlan.plan, status: subscriptionStatus });
          }

          // Detect renewal: was expired/cancelled, now active again
          if (previousDbStatus && ["expired", "cancelled", "canceled"].includes(previousDbStatus)) {
            logStep("Renewal detected", { previousStatus: previousDbStatus });
            try {
              await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-superadmin-subscription-event`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
                body: JSON.stringify({
                  eventType: "plan_renewed",
                  tenantName,
                  tenantEmail: userEmail,
                  newPlan: plan,
                  language: "en",
                }),
              });
            } catch (e) {
              logStep("Failed to notify renewal", { error: String(e) });
            }
          }
        }
      }
    } else {
      logStep("No active subscription found");

      if (tenantSub?.status === "trial" && tenantSub.plan) {
        const mappedPlan = DB_TO_PLAN[tenantSub.plan] || tenantSub.plan;
        const trialEnd = getDbSubscriptionEnd(tenantSub);

        logStep("Using DB trial fallback for Stripe customer", {
          plan: mappedPlan,
          trialEnd,
        });

        return new Response(JSON.stringify({
          subscribed: true,
          plan: mappedPlan,
          status: tenantSub.status,
          subscription_end: trialEnd,
          has_stripe_customer: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check for cancelled subscriptions
      const cancelledSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 1,
      });

      if (userTenantId && previousDbStatus === "active") {
        // Was active, now not active → cancelled or expired
        const eventType = cancelledSubs.data.length > 0 ? "plan_cancelled" : "plan_expired";
        logStep(`${eventType} detected`, { previousPlan: previousDbPlan });

        // Update DB status
        await supabaseClient
          .from("tenant_subscriptions")
          .update({ status: eventType === "plan_cancelled" ? "cancelled" : "expired" })
          .eq("tenant_id", userTenantId);

        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-superadmin-subscription-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
            body: JSON.stringify({
              eventType,
              tenantName,
              tenantEmail: userEmail,
              previousPlan: previousDbPlan,
              language: "en",
            }),
          });
        } catch (e) {
          logStep(`Failed to notify ${eventType}`, { error: String(e) });
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      has_stripe_customer: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});