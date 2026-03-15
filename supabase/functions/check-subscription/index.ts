import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs mapping to plan names
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Tqetfpt7pnhNFf": "essentiel",
  "prod_TqetHNAL0zc5kD": "professionnel",
  "prod_TqeuZk0jVNwjEp": "entreprise",
};

// Map plan names to DB plan names for tenant_subscriptions sync
const PLAN_TO_DB: Record<string, { plan: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  "essentiel": { plan: "basic", price: 49, members: 200, branches: 1, users: 5, storage: 500 },
  "professionnel": { plan: "standard", price: 99, members: 1000, branches: 3, users: 15, storage: 2000 },
  "entreprise": { plan: "premium", price: 199, members: -1, branches: -1, users: -1, storage: -1 },
};

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
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's tenant_id first (needed for DB fallback)
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    const userTenantId = profile?.tenant_id;
    logStep("User tenant", { tenantId: userTenantId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer for this user, checking tenant subscription in DB");
      
      // Fallback: check tenant_subscriptions table (subscription may be under admin's email)
      if (userTenantId) {
        const { data: tenantSub } = await supabaseClient
          .from("tenant_subscriptions")
          .select("plan, status, current_period_end")
          .eq("tenant_id", userTenantId)
          .single();

        if (tenantSub && (tenantSub.status === "active" || tenantSub.status === "trialing" || tenantSub.status === "trial") && tenantSub.plan) {
          // Map DB plan names back to frontend plan names
          const DB_TO_PLAN: Record<string, string> = {
            "basic": "essentiel",
            "standard": "professionnel",
            "premium": "entreprise",
            "free": "free",
          };
          const mappedPlan = DB_TO_PLAN[tenantSub.plan] || tenantSub.plan;
          logStep("Found active tenant subscription in DB", { plan: mappedPlan });
          return new Response(JSON.stringify({ 
            subscribed: true,
            plan: mappedPlan,
            subscription_end: tenantSub.current_period_end,
            has_stripe_customer: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: null,
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
      
      // Get the product ID to determine the plan
      const productId = subscription.items.data[0].price.product as string;
      plan = PRODUCT_TO_PLAN[productId] || null;
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        productId,
        plan,
      });

      // Sync plan to tenant_subscriptions in database
      if (plan) {
        const dbPlan = PLAN_TO_DB[plan];
        if (dbPlan && userTenantId) {
          const { error: syncError } = await supabaseClient
            .from("tenant_subscriptions")
            .update({
              plan: dbPlan.plan,
              status: "active",
              price_monthly: dbPlan.price,
              max_members: dbPlan.members,
              max_branches: dbPlan.branches,
              max_users: dbPlan.users,
              max_storage_mb: dbPlan.storage,
              current_period_end: subscriptionEnd,
              trial_ends_at: null,
            })
            .eq("tenant_id", userTenantId);

          if (syncError) {
            logStep("Failed to sync plan to DB", { error: syncError.message });
          } else {
            logStep("Plan synced to tenant_subscriptions", { tenantId: userTenantId, dbPlan: dbPlan.plan });
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
                  tenantEmail: user.email,
                  newPlan: plan,
                  language: "en",
                }),
              });
            } catch (e) { logStep("Failed to notify renewal", { error: String(e) }); }
          }
        }
      }
    } else {
      logStep("No active subscription found");

      // Check for cancelled subscriptions
      const cancelledSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 1,
      });

      if (userTenantId && previousDbStatus === "active") {
        // Was active, now not active → cancelled or expired
        const eventType = cancelledSubs.data.length > 0 ? "plan_cancelled" : "plan_expired";
        logStep(`Detected ${eventType}`, { previousPlan: previousDbPlan });

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
              tenantEmail: user.email,
              previousPlan: previousDbPlan,
              language: "en",
            }),
          });
        } catch (e) { logStep(`Failed to notify ${eventType}`, { error: String(e) }); }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      subscription_end: subscriptionEnd,
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
