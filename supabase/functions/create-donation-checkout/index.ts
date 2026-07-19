import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Naive in-memory rate limit (per IP)
const RATE: Map<string, { count: number; ts: number }> = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;

function rateLimited(ip: string) {
  const now = Date.now();
  const entry = RATE.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    RATE.set(ip, { count: 1, ts: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { slug, amount, method, donor_name, donor_email, message, language, origin } = body || {};

    if (!slug || !amount || !method || !donor_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const amtNum = Number(amount);
    if (!isFinite(amtNum) || amtNum <= 0 || amtNum > 100000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Load public config (validates enabled + addon)
    const { data: cfgRows } = await admin.rpc("get_public_giving_config", { _slug: slug });
    const cfg = cfgRows?.[0];
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Giving not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (amtNum < Number(cfg.min_amount || 1)) {
      return new Response(JSON.stringify({ error: "Amount below minimum" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load full private settings via service role
    const { data: settings } = await admin
      .from("tenant_giving_settings")
      .select("*")
      .eq("tenant_id", cfg.tenant_id)
      .single();

    if (!settings) {
      return new Response(JSON.stringify({ error: "No settings" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseOrigin = origin || req.headers.get("origin") || "";
    const successUrl = `${baseOrigin}/site/${slug}/give/success`;
    const cancelUrl = `${baseOrigin}/site/${slug}/give/cancel`;

    if (method === "card") {
      if (!settings.stripe_enabled || !settings.stripe_account_id) {
        return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });

      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          customer_email: donor_email,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: (cfg.currency || "USD").toLowerCase(),
                unit_amount: Math.round(amtNum * 100),
                product_data: {
                  name: `Donation to ${cfg.tenant_name}`,
                  description: message ? String(message).slice(0, 200) : undefined,
                },
              },
            },
          ],
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            tenant_id: cfg.tenant_id,
            donor_name: donor_name || "",
            donor_email,
            message: message || "",
            language: language || "en",
            source: "online_giving",
          },
          // Optional platform fee (0 for v1)
          // payment_intent_data: { application_fee_amount: 0 },
        },
        { stripeAccount: settings.stripe_account_id },
      );

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "moncash") {
      if (!settings.moncash_enabled || !settings.moncash_client_id || !settings.moncash_client_secret) {
        return new Response(JSON.stringify({ error: "MonCash not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const isLive = settings.moncash_env === "live";
      const apiBase = isLive
        ? "https://moncashbutton.digicelgroup.com/Api"
        : "https://sandbox.moncashbutton.digicelgroup.com/Api";
      const gatewayBase = isLive
        ? "https://moncashbutton.digicelgroup.com/Moncash-middleware"
        : "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";

      // Get OAuth token
      const basic = btoa(`${settings.moncash_client_id}:${settings.moncash_client_secret}`);
      const tokenRes = await fetch(`${apiBase}/oauth/token?grant_type=client_credentials&scope=read,write`, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
      });
      if (!tokenRes.ok) {
        const t = await tokenRes.text();
        console.error("MonCash token failed", tokenRes.status, t);
        return new Response(JSON.stringify({ error: "MonCash auth failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const tokenJson = await tokenRes.json();
      const accessToken = tokenJson.access_token;

      const orderId = `gv_${cfg.tenant_id.slice(0, 8)}_${Date.now()}`;

      // Persist pending donation for webhook reconciliation
      await admin.from("donations").insert({
        tenant_id: cfg.tenant_id,
        amount: amtNum,
        donation_type: "online",
        payment_method: "moncash",
        donation_date: new Date().toISOString().slice(0, 10),
        description: "Online giving (pending MonCash)",
        notes: JSON.stringify({ orderId, donor_name, donor_email, message, status: "pending" }),
      });

      const payRes = await fetch(`${apiBase}/v1/CreatePayment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ amount: amtNum, orderId }),
      });
      if (!payRes.ok) {
        const t = await payRes.text();
        console.error("MonCash CreatePayment failed", payRes.status, t);
        return new Response(JSON.stringify({ error: "MonCash payment creation failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const payJson = await payRes.json();
      const token = payJson?.payment_token?.token;
      if (!token) {
        return new Response(JSON.stringify({ error: "MonCash returned no token" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const redirectUrl = `${gatewayBase}/Payment/Redirect?token=${token}`;
      return new Response(JSON.stringify({ url: redirectUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown method" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("create-donation-checkout error", err);
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
