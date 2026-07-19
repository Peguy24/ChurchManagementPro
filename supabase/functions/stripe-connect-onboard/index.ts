import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, return_path } = await req.json().catch(() => ({ action: "onboard" }));

    // Resolve tenant from profile
    const { data: profile } = await admin.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) return new Response(JSON.stringify({ error: "No tenant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Verify admin
    const { data: isAdmin } = await admin.rpc("is_tenant_admin", { _user_id: user.id });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Get or create settings row
    const { data: settings } = await admin
      .from("tenant_giving_settings")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const { data: tenant } = await admin.from("tenants").select("name, slug").eq("id", tenantId).single();

    const origin = req.headers.get("origin") || "";
    const returnUrl = `${origin}${return_path || "/settings/online-giving"}?stripe_connect=return`;
    const refreshUrl = `${origin}${return_path || "/settings/online-giving"}?stripe_connect=refresh`;

    if (action === "status") {
      const acctId = settings?.stripe_account_id;
      if (!acctId) return new Response(JSON.stringify({ connected: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const acct = await stripe.accounts.retrieve(acctId);
      return new Response(JSON.stringify({
        connected: true,
        account_id: acctId,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "disconnect") {
      if (settings?.stripe_account_id) {
        try { await stripe.accounts.del(settings.stripe_account_id); } catch (e) { console.warn("account del failed", e); }
      }
      await admin.from("tenant_giving_settings").upsert({
        tenant_id: tenantId,
        stripe_account_id: null,
        stripe_enabled: false,
      }, { onConflict: "tenant_id" });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default action: onboard
    let acctId = settings?.stripe_account_id || null;
    if (!acctId) {
      const created = await stripe.accounts.create({
        type: "standard",
        email: user.email || undefined,
        business_profile: {
          name: tenant?.name,
          url: tenant?.slug ? `${origin}/site/${tenant.slug}` : undefined,
        },
        metadata: { tenant_id: tenantId },
      });
      acctId = created.id;
      await admin.from("tenant_giving_settings").upsert({
        tenant_id: tenantId,
        stripe_account_id: acctId,
        stripe_enabled: true,
      }, { onConflict: "tenant_id" });
    }

    const link = await stripe.accountLinks.create({
      account: acctId!,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: acctId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("stripe-connect-onboard error", err);
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
