import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REWARD_DAYS = 30;

/**
 * Applies the +30 day reward to BOTH sides of a referral.
 * - Trial tenant => trial_ends_at += 30 days
 * - Paid tenant (Stripe sub) => create 100% off coupon (once) and apply to subscription
 * Body: { referralId: string }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referralId } = await req.json();
    if (!referralId) throw new Error("Missing referralId");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    const { data: referral, error: refErr } = await supa
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .single();
    if (refErr || !referral) throw new Error("Referral not found");

    if (referral.status === "rewarded" || referral.status === "rejected" || referral.status === "expired") {
      return new Response(JSON.stringify({ applied: false, reason: "already_processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = { referrer: null, referred: null };

    // Apply to each side
    for (const side of ["referrer", "referred"] as const) {
      const tenantId = side === "referrer" ? referral.referrer_tenant_id : referral.referred_tenant_id;
      const alreadyApplied = side === "referrer" ? referral.referrer_reward_applied : referral.referred_reward_applied;
      if (alreadyApplied) {
        results[side] = { skipped: true, reason: "already_applied" };
        continue;
      }

      // Get tenant subscription
      const { data: sub } = await supa
        .from("tenant_subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      // Get tenant email for Stripe lookup
      const { data: tenant } = await supa
        .from("tenants")
        .select("name, contact_email")
        .eq("id", tenantId)
        .maybeSingle();

      let rewardType: "trial_extension" | "stripe_coupon" = "trial_extension";
      let stripeCouponId: string | null = null;
      const isOnTrial = sub?.status === "trialing" || (sub?.trial_ends_at && new Date(sub.trial_ends_at) > new Date());

      try {
        if (isOnTrial && sub?.trial_ends_at) {
          // Extend trial
          const newEnd = new Date(sub.trial_ends_at);
          newEnd.setDate(newEnd.getDate() + REWARD_DAYS);
          await supa
            .from("tenant_subscriptions")
            .update({ trial_ends_at: newEnd.toISOString() })
            .eq("tenant_id", tenantId);
          rewardType = "trial_extension";
        } else {
          // Try Stripe coupon path - find Stripe customer by tenant email
          let customerId: string | null = null;
          if (tenant?.contact_email) {
            const cust = await stripe.customers.list({ email: tenant.contact_email, limit: 1 });
            if (cust.data.length) customerId = cust.data[0].id;
          }

          if (customerId) {
            const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
            if (subs.data.length) {
              // Create one-time 100% off coupon
              const coupon = await stripe.coupons.create({
                percent_off: 100,
                duration: "once",
                name: `Referral reward - ${tenant?.name ?? tenantId}`,
                metadata: { referral_id: referral.id, tenant_id: tenantId, side },
              });
              stripeCouponId = coupon.id;
              // Apply via subscription discounts
              await stripe.subscriptions.update(subs.data[0].id, {
                discounts: [{ coupon: coupon.id }],
              });
              rewardType = "stripe_coupon";
            } else {
              // No active sub - extend trial fallback if possible
              if (sub?.trial_ends_at) {
                const base = new Date(sub.trial_ends_at) > new Date() ? new Date(sub.trial_ends_at) : new Date();
                base.setDate(base.getDate() + REWARD_DAYS);
                await supa
                  .from("tenant_subscriptions")
                  .update({ trial_ends_at: base.toISOString() })
                  .eq("tenant_id", tenantId);
                rewardType = "trial_extension";
              }
            }
          } else {
            // No Stripe customer => extend trial
            if (sub?.trial_ends_at) {
              const base = new Date(sub.trial_ends_at) > new Date() ? new Date(sub.trial_ends_at) : new Date();
              base.setDate(base.getDate() + REWARD_DAYS);
              await supa
                .from("tenant_subscriptions")
                .update({ trial_ends_at: base.toISOString() })
                .eq("tenant_id", tenantId);
              rewardType = "trial_extension";
            }
          }
        }

        // Log reward
        await supa.from("referral_rewards").insert({
          tenant_id: tenantId,
          referral_id: referral.id,
          reward_type: rewardType,
          days_added: REWARD_DAYS,
          stripe_coupon_id: stripeCouponId,
          applied_by_role: "system",
        });

        // Mark side applied
        const updateField = side === "referrer" ? { referrer_reward_applied: true } : { referred_reward_applied: true };
        await supa.from("referrals").update(updateField).eq("id", referral.id);

        results[side] = { applied: true, reward_type: rewardType, days_added: REWARD_DAYS, stripe_coupon_id: stripeCouponId };
      } catch (sideErr) {
        console.error(`Reward error for ${side}:`, sideErr);
        results[side] = { applied: false, error: sideErr instanceof Error ? sideErr.message : String(sideErr) };
      }
    }

    // If both sides applied, mark referral rewarded
    const { data: refresh } = await supa.from("referrals").select("referrer_reward_applied, referred_reward_applied").eq("id", referral.id).single();
    if (refresh?.referrer_reward_applied && refresh?.referred_reward_applied) {
      await supa
        .from("referrals")
        .update({ status: "rewarded", rewarded_at: new Date().toISOString() })
        .eq("id", referral.id);
    }

    return new Response(JSON.stringify({ applied: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
