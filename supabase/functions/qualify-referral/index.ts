import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Qualifies a referral after the referred church's first paid invoice.
 * Triggers reward application for both sides.
 *
 * Body: { referredTenantId: string, source?: 'webhook' | 'manual' }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referredTenantId, source = "webhook" } = await req.json();
    if (!referredTenantId) throw new Error("Missing referredTenantId");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: referral } = await supa
      .from("referrals")
      .select("*")
      .eq("referred_tenant_id", referredTenantId)
      .maybeSingle();

    if (!referral) {
      return new Response(JSON.stringify({ qualified: false, reason: "no_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (referral.status === "rewarded" || referral.status === "expired" || referral.status === "rejected") {
      return new Response(JSON.stringify({ qualified: false, reason: "already_processed", status: referral.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark qualified
    if (referral.status === "pending") {
      await supa
        .from("referrals")
        .update({
          status: "qualified",
          qualified_at: new Date().toISOString(),
          notes: `Qualified via ${source}`,
        })
        .eq("id", referral.id);
    }

    // Trigger reward application
    const { data: rewardData, error: rewardErr } = await supa.functions.invoke("apply-referral-reward", {
      body: { referralId: referral.id },
    });

    if (rewardErr) {
      console.error("apply-referral-reward error:", rewardErr);
    }

    return new Response(JSON.stringify({ qualified: true, referral_id: referral.id, reward: rewardData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
