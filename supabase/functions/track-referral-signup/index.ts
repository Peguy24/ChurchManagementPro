import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, referredTenantId } = await req.json();
    if (!code || !referredTenantId) throw new Error("Missing code or referredTenantId");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const codeUpper = String(code).trim().toUpperCase();

    // Lookup code
    const { data: rc } = await supa
      .from("referral_codes")
      .select("tenant_id, is_active")
      .eq("code", codeUpper)
      .maybeSingle();

    if (!rc || !rc.is_active) {
      return new Response(JSON.stringify({ tracked: false, reason: "invalid_code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rc.tenant_id === referredTenantId) {
      return new Response(JSON.stringify({ tracked: false, reason: "self_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already a referral for this referred tenant?
    const { data: existing } = await supa
      .from("referrals")
      .select("id")
      .eq("referred_tenant_id", referredTenantId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ tracked: false, reason: "already_referred" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: referral, error: insErr } = await supa
      .from("referrals")
      .insert({
        referrer_tenant_id: rc.tenant_id,
        referred_tenant_id: referredTenantId,
        referral_code: codeUpper,
        status: "pending",
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ tracked: true, referral_id: referral.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
