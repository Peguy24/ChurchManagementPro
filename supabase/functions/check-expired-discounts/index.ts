import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EXPIRED-DISCOUNTS] ${step}${detailsStr}`);
};

const PLAN_TO_DB: Record<string, { plan: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  essentiel: { plan: "basic", price: 49, members: 200, branches: 1, users: 5, storage: 500 },
  professionnel: { plan: "standard", price: 99, members: 1000, branches: 3, users: 15, storage: 2000 },
  entreprise: { plan: "premium", price: 199, members: -1, branches: -1, users: -1, storage: -1 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Find expired but still active discounts
    const { data: expiredDiscounts, error: fetchError } = await supabaseClient
      .from("subscription_discounts")
      .select("*")
      .eq("is_active", true)
      .lt("valid_until", new Date().toISOString());

    if (fetchError) throw new Error(`Failed to fetch expired discounts: ${fetchError.message}`);

    if (!expiredDiscounts || expiredDiscounts.length === 0) {
      logStep("No expired discounts found");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found expired discounts", { count: expiredDiscounts.length });
    let processed = 0;

    for (const discount of expiredDiscounts) {
      try {
        logStep("Processing expired discount", { 
          id: discount.id, 
          tenant_id: discount.tenant_id, 
          type: discount.discount_type 
        });

        // Deactivate the discount
        await supabaseClient
          .from("subscription_discounts")
          .update({ is_active: false } as any)
          .eq("id", discount.id);

        if (discount.discount_type === "free") {
          // Free access expired — check for previous plan
          const previousPriceId = (discount as any).previous_price_id;
          const previousPlan = (discount as any).previous_plan;

          if (previousPriceId) {
            // Try to restore previous subscription
            logStep("Attempting to restore previous plan", { 
              previousPlan, 
              previousPriceId,
              tenantId: discount.tenant_id 
            });

            // Find the Stripe customer for this tenant
            const { data: tenantProfiles } = await supabaseClient
              .from("profiles")
              .select("id")
              .eq("tenant_id", discount.tenant_id)
              .limit(10);

            let customerId: string | null = null;
            if (tenantProfiles) {
              for (const profile of tenantProfiles) {
                const { data: authUser } = await supabaseClient.auth.admin.getUserById(profile.id);
                if (authUser?.user?.email) {
                  const customers = await stripe.customers.list({ email: authUser.user.email, limit: 1 });
                  if (customers.data.length > 0) {
                    customerId = customers.data[0].id;
                    break;
                  }
                }
              }
            }

            if (customerId) {
              // Create new subscription with the previous price
              const newSubscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: previousPriceId }],
                payment_behavior: "default_incomplete",
                expand: ["latest_invoice.payment_intent"],
              });

              logStep("Previous plan restored via Stripe", { 
                newSubscriptionId: newSubscription.id,
                previousPlan 
              });

              // Update tenant_subscriptions
              const dbPlan = previousPlan ? PLAN_TO_DB[previousPlan] : null;
              if (dbPlan) {
                await supabaseClient
                  .from("tenant_subscriptions")
                  .update({
                    plan: dbPlan.plan,
                    status: "active",
                    price_monthly: dbPlan.price,
                    max_members: dbPlan.members,
                    max_branches: dbPlan.branches,
                    max_users: dbPlan.users,
                    max_storage_mb: dbPlan.storage,
                    current_period_end: new Date(newSubscription.current_period_end * 1000).toISOString(),
                    trial_ends_at: null,
                  })
                  .eq("tenant_id", discount.tenant_id);
              }

              // Notify: plan reactivated
              await supabaseClient.from("tenant_notifications").insert({
                tenant_id: discount.tenant_id,
                notification_type: "discount_expired",
                severity: "info",
                title: "free_access_ended_plan_restored",
                message: `plan:${previousPlan}`,
                metadata: { previous_plan: previousPlan, discount_id: discount.id },
              });

              logStep("Tenant notified of plan restoration");
            } else {
              // No Stripe customer found — expire the subscription
              logStep("No Stripe customer found, expiring subscription");
              await expireTenantSubscription(supabaseClient, discount);
            }
          } else {
            // No previous plan — force plan selection
            logStep("No previous plan, expiring subscription for plan selection");
            await expireTenantSubscription(supabaseClient, discount);
          }
        } else {
          // Percentage or fixed discount expired — Stripe handles coupon expiry
          // Just notify the tenant
          await supabaseClient.from("tenant_notifications").insert({
            tenant_id: discount.tenant_id,
            notification_type: "discount_expired",
            severity: "info",
            title: "discount_ended",
            message: `type:${discount.discount_type}|value:${discount.discount_value}`,
            metadata: { discount_type: discount.discount_type, discount_value: discount.discount_value, discount_id: discount.id },
          });

          logStep("Tenant notified of discount expiry (percentage/fixed)");
        }

        processed++;
      } catch (discountError) {
        logStep("Error processing discount", { 
          id: discount.id, 
          error: String(discountError) 
        });
      }
    }

    logStep("Processing complete", { processed, total: expiredDiscounts.length });

    return new Response(JSON.stringify({ processed, total: expiredDiscounts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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

async function expireTenantSubscription(supabaseClient: any, discount: any) {
  await supabaseClient
    .from("tenant_subscriptions")
    .update({
      status: "expired",
      plan: "free",
      price_monthly: 0,
    })
    .eq("tenant_id", discount.tenant_id);

  await supabaseClient.from("tenant_notifications").insert({
    tenant_id: discount.tenant_id,
    notification_type: "discount_expired",
    severity: "warning",
    title: "free_access_ended_select_plan",
    message: "free_access_expired",
    metadata: { discount_id: discount.id },
  });
}
