import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-DISCOUNT] ${step}${detailsStr}`);
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

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const caller = userData.user;
    if (!caller) throw new Error("Not authenticated");

    // Check super admin role
    const { data: roleCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    const { data: platformRoleCheck } = await supabaseClient
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "super_admin");

    const isSuperAdmin = (roleCheck && roleCheck.length > 0) || (platformRoleCheck && platformRoleCheck.length > 0);
    if (!isSuperAdmin) throw new Error("Unauthorized: Super admin access required");
    logStep("Super admin verified");

    const { tenant_id, discount_id, discount_type, discount_value, valid_until } = await req.json();
    if (!tenant_id || !discount_id) throw new Error("Missing tenant_id or discount_id");
    logStep("Request params", { tenant_id, discount_id, discount_type, discount_value });

    // Find a user email associated with this tenant to look up Stripe customer
    const { data: tenantProfiles } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id)
      .limit(10);

    if (!tenantProfiles || tenantProfiles.length === 0) {
      return new Response(JSON.stringify({ applied: false, reason: "no_users" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get emails from auth for these profile IDs
    let customerEmail: string | null = null;
    for (const profile of tenantProfiles) {
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(profile.id);
      if (authUser?.user?.email) {
        customerEmail = authUser.user.email;
        break;
      }
    }

    if (!customerEmail) {
      logStep("No email found for tenant users");
      return new Response(JSON.stringify({ applied: false, reason: "no_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Found tenant user email", { email: customerEmail });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found — discount saved for future checkout");
      return new Response(JSON.stringify({ applied: false, reason: "no_stripe_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription — discount saved for future checkout");
      return new Response(JSON.stringify({ applied: false, reason: "no_active_subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Handle free access: cancel subscription and activate in DB
    if (discount_type === "free") {
      await stripe.subscriptions.cancel(subscription.id, {
        prorate: true,
      });
      logStep("Subscription cancelled for free access");

      // Activate plan directly in DB
      const periodEnd = new Date();
      if (valid_until) {
        periodEnd.setTime(new Date(valid_until).getTime());
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      await supabaseClient
        .from("tenant_subscriptions")
        .update({
          status: "active",
          price_monthly: 0,
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: null,
        })
        .eq("tenant_id", tenant_id);

      logStep("Free access activated in DB");
      return new Response(JSON.stringify({ applied: true, method: "free_access" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Stripe coupon for percentage or fixed discount
    const couponId = `discount_${discount_id}`;
    let stripeCouponId: string;

    try {
      await stripe.coupons.retrieve(couponId);
      stripeCouponId = couponId;
      logStep("Existing coupon found", { couponId });
    } catch {
      const couponParams: Stripe.CouponCreateParams = {
        id: couponId,
        // "repeating" so it applies to subsequent invoices
        duration: valid_until ? "repeating" : "forever",
      };

      if (valid_until) {
        // Calculate months until expiration
        const now = new Date();
        const end = new Date(valid_until);
        const months = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        couponParams.duration_in_months = months;
      }

      if (discount_type === "percentage") {
        couponParams.percent_off = discount_value;
      } else {
        couponParams.amount_off = Math.round(discount_value * 100);
        couponParams.currency = "usd";
      }

      await stripe.coupons.create(couponParams);
      stripeCouponId = couponId;
      logStep("Coupon created", { couponId, type: discount_type, value: discount_value });
    }

    // Apply coupon to the subscription — takes effect at next renewal
    await stripe.subscriptions.update(subscription.id, {
      coupon: stripeCouponId,
    });

    logStep("Coupon applied to subscription", { subscriptionId: subscription.id, couponId: stripeCouponId });

    return new Response(JSON.stringify({ applied: true, method: "stripe_coupon" }), {
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
