import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Monthly Price IDs for each plan - synced with useSubscription.tsx
const PRICE_IDS = {
  essentiel: "price_1TIVUcF3VvKmdn5GYXcFcGh4",
  professionnel: "price_1TIVVDF3VvKmdn5Gjf1yY160",
  entreprise: "price_1TIVVwF3VvKmdn5GV4rCswUg",
};

// Yearly Price IDs (15% discount)
const YEARLY_PRICE_IDS = {
  essentiel: "price_1TIVUxF3VvKmdn5GC7fA2VyK",
  professionnel: "price_1TIVVfF3VvKmdn5GXC0UT8N8",
  entreprise: "price_1TIVWFF3VvKmdn5G7yPSifLh",
};

// Plan limits for direct DB activation (free access)
const PLAN_TO_DB: Record<string, { plan: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  essentiel: { plan: "basic", price: 29.99, members: 200, branches: 1, users: 5, storage: 500 },
  professionnel: { plan: "standard", price: 59.99, members: 1000, branches: 3, users: 15, storage: 2000 },
  entreprise: { plan: "premium", price: 99.99, members: -1, branches: -1, users: -1, storage: -1 },
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

    // Get the plan and interval from request body
    const { plan, interval } = await req.json();
    const billingInterval = interval === "yearly" ? "yearly" : "monthly";
    
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      throw new Error(`Invalid plan: ${plan}. Valid plans: essentiel, professionnel, entreprise`);
    }
    const priceId = billingInterval === "yearly" 
      ? YEARLY_PRICE_IDS[plan as keyof typeof YEARLY_PRICE_IDS]
      : PRICE_IDS[plan as keyof typeof PRICE_IDS];
    logStep("Plan selected", { plan, priceId, interval: billingInterval });

    // Get user's tenant_id
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const tenantId = profile?.tenant_id;
    logStep("User tenant", { tenantId });

    // Look up active discount for this tenant
    let discount: { discount_type: string; discount_value: number; id: string; valid_until: string | null; target_plan: string | null } | null = null;
    if (tenantId) {
      const { data: discounts } = await supabaseClient
        .from("subscription_discounts")
        .select("id, discount_type, discount_value, valid_until, target_plan")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (discounts && discounts.length > 0) {
        const d = discounts[0];
        // Check if not expired
        if (!d.valid_until || new Date(d.valid_until) > new Date()) {
          // Check if target_plan matches (null or "any" = any plan)
          if (!d.target_plan || d.target_plan === "any" || d.target_plan === plan) {
            discount = d;
            logStep("Active discount found", { type: d.discount_type, value: d.discount_value, targetPlan: d.target_plan });
          } else {
            logStep("Discount skipped — target plan mismatch", { targetPlan: d.target_plan, selectedPlan: plan });
          }
        } else {
          logStep("Discount expired", { valid_until: d.valid_until });
        }
      }
    }

    // Handle FREE ACCESS discount: bypass Stripe entirely
    if (discount && discount.discount_type === "free") {
      logStep("Free access discount - activating plan directly in DB");
      const dbPlan = PLAN_TO_DB[plan];
      if (dbPlan && tenantId) {
        const periodEnd = new Date();
        // If discount has valid_until, use that; otherwise grant 1 year
        if (discount.valid_until) {
          periodEnd.setTime(new Date(discount.valid_until).getTime());
        } else {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        }

        const { error: syncError } = await supabaseClient
          .from("tenant_subscriptions")
          .update({
            plan: dbPlan.plan,
            status: "active",
            price_monthly: 0,
            max_members: dbPlan.members,
            max_branches: dbPlan.branches,
            max_users: dbPlan.users,
            max_storage_mb: dbPlan.storage,
            current_period_end: periodEnd.toISOString(),
            trial_ends_at: null,
          })
          .eq("tenant_id", tenantId);

        if (syncError) {
          logStep("Failed to activate free plan", { error: syncError.message });
          throw new Error("Failed to activate free access plan");
        }

        logStep("Free plan activated successfully", { tenantId, plan: dbPlan.plan, until: periodEnd.toISOString() });
        return new Response(JSON.stringify({ 
          free_access: true, 
          message: "Accès gratuit activé avec succès." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Create or find Stripe coupon if there's a discount
    let stripeCouponId: string | undefined;
    if (discount && (discount.discount_type === "percentage" || discount.discount_type === "fixed")) {
      try {
        // Create a unique coupon for this discount
        const couponId = `discount_${discount.id}`;
        
        // Try to retrieve existing coupon first
        try {
          await stripe.coupons.retrieve(couponId);
          stripeCouponId = couponId;
          logStep("Existing Stripe coupon found", { couponId });
        } catch {
          // Coupon doesn't exist, create it
          const couponParams: Stripe.CouponCreateParams = {
            id: couponId,
            duration: discount.valid_until ? "once" : "forever",
          };

          if (discount.discount_type === "percentage") {
            couponParams.percent_off = discount.discount_value;
          } else {
            // Fixed amount discount (in cents)
            couponParams.amount_off = Math.round(discount.discount_value * 100);
            couponParams.currency = "usd";
          }

          await stripe.coupons.create(couponParams);
          stripeCouponId = couponId;
          logStep("Stripe coupon created", { couponId, type: discount.discount_type, value: discount.discount_value });
        }
      } catch (couponError) {
        logStep("Warning: Could not create coupon, proceeding without discount", { 
          error: couponError instanceof Error ? couponError.message : String(couponError) 
        });
      }
    }

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });

      // Check for existing active subscription
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (existingSubs.data.length > 0) {
        const currentPriceId = existingSubs.data[0].items.data[0].price.id;
        logStep("User already has active subscription", { currentPriceId });

        if (currentPriceId === priceId) {
          throw new Error("Vous êtes déjà abonné à ce plan.");
        }

        // Different plan: update the existing subscription
        const subscriptionId = existingSubs.data[0].id;
        const subscriptionItemId = existingSubs.data[0].items.data[0].id;
        
        const updateParams: Stripe.SubscriptionUpdateParams = {
          items: [{ id: subscriptionItemId, price: priceId }],
          proration_behavior: "create_prorations",
        };

        // Apply coupon to subscription update if available
        if (stripeCouponId) {
          updateParams.coupon = stripeCouponId;
          logStep("Applying coupon to subscription update", { couponId: stripeCouponId });
        }

        await stripe.subscriptions.update(subscriptionId, updateParams);

        logStep("Subscription updated to new plan", { subscriptionId, newPriceId: priceId });

        // Notify super admins about plan change
        try {
          const { data: tenantProfile } = await supabaseClient
            .from("profiles")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
          
          let tenantName = "Unknown";
          if (tenantProfile?.tenant_id) {
            const { data: tenant } = await supabaseClient
              .from("tenants")
              .select("name")
              .eq("id", tenantProfile.tenant_id)
              .single();
            tenantName = tenant?.name || "Unknown";
          }

          const PRODUCT_TO_PLAN: Record<string, string> = {
            "prod_Tqetfpt7pnhNFf": "essentiel",
            "prod_TqetHNAL0zc5kD": "professionnel",
            "prod_TqeuZk0jVNwjEp": "entreprise",
          };
          const currentProduct = existingSubs.data[0].items.data[0].price.product as string;
          const previousPlanName = PRODUCT_TO_PLAN[currentProduct] || "unknown";

          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-superadmin-subscription-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
            body: JSON.stringify({
              eventType: "plan_updated",
              tenantName,
              tenantEmail: user.email,
              previousPlan: previousPlanName,
              newPlan: plan,
              language: "en",
            }),
          });
          logStep("Super admin notified of plan change");
        } catch (notifyErr) {
          logStep("Failed to notify super admins", { error: String(notifyErr) });
        }

        return new Response(JSON.stringify({ updated: true, message: "Votre abonnement a été mis à jour." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      logStep("No existing customer, will create new one");
    }

    const origin = "https://churchmanagementpro.com";
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/settings/subscription?checkout=success`,
      cancel_url: `${origin}/settings/subscription?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
    };

    // Apply discount coupon to checkout session
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
      logStep("Applying coupon to checkout session", { couponId: stripeCouponId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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
