import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[UPDATE-TAX-EXEMPT] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr) throw new Error(`Auth error: ${userErr.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("Not authenticated");

    // Verify super admin
    const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSA) throw new Error("Unauthorized: super admin required");

    const body = await req.json();
    const { tenant_id, action, rejection_reason } = body as {
      tenant_id: string;
      action: "approve" | "reject" | "revoke";
      rejection_reason?: string;
    };
    if (!tenant_id || !action) throw new Error("Missing tenant_id or action");

    // Find tenant contact email
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, contact_email")
      .eq("id", tenant_id)
      .single();
    if (!tenant) throw new Error("Tenant not found");

    let email = tenant.contact_email as string | null;
    if (!email) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("email")
        .eq("tenant_id", tenant_id)
        .limit(1)
        .maybeSingle();
      email = prof?.email ?? null;
    }

    // Update Stripe customer's tax_exempt flag
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    if (email) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        const taxExempt = action === "approve" ? "exempt" : "none";
        await stripe.customers.update(customers.data[0].id, { tax_exempt: taxExempt });
        log("Updated stripe customer", { id: customers.data[0].id, taxExempt });
      } else {
        log("No Stripe customer yet — flag will apply on next checkout via tax_exempt set later");
      }
    }

    // Update DB
    const newStatus =
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "none";
    const { error: upErr } = await supabase
      .from("tenant_tax_exemptions")
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        rejection_reason: action === "reject" ? rejection_reason ?? null : null,
      })
      .eq("tenant_id", tenant_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
