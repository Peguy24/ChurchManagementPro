import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-ALL-INVOICES] ${step}${detailsStr}`);
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
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Check super admin role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: platformRole } = await supabaseClient
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData && !platformRole) {
      throw new Error("Unauthorized: super admin access required");
    }
    logStep("Super admin verified", { userId: user.id });

    // Parse query params
    const url = new URL(req.url);
    const monthParam = url.searchParams.get("month"); // YYYY-MM format
    const statusFilter = url.searchParams.get("status"); // paid, open, uncollectible, void

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Determine date range
    let createdGte: number;
    let createdLte: number;
    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      createdGte = Math.floor(start.getTime() / 1000);
      createdLte = Math.floor(end.getTime() / 1000);
    } else {
      // Default: current month
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      createdGte = Math.floor(start.getTime() / 1000);
      createdLte = Math.floor(end.getTime() / 1000);
    }

    logStep("Date range", { from: new Date(createdGte * 1000).toISOString(), to: new Date(createdLte * 1000).toISOString() });

    // Real price IDs
    const realPriceIds = new Set([
      "price_1SsxZvF3VvKmdn5Gokml3EOt",
      "price_1Ssxa9F3VvKmdn5GGE0wSfBk",
      "price_1SsxaeF3VvKmdn5G8aP7l7GE",
      "price_1TBi3DF3VvKmdn5GxgjBbhoe",
      "price_1TBi3bF3VvKmdn5G51dRztux",
      "price_1TBi4AF3VvKmdn5G1d7gKP8O",
    ]);

    const planNameMap: Record<string, string> = {
      "price_1SsxZvF3VvKmdn5Gokml3EOt": "Essentiel (Monthly)",
      "price_1Ssxa9F3VvKmdn5GGE0wSfBk": "Professionnel (Monthly)",
      "price_1SsxaeF3VvKmdn5G8aP7l7GE": "Entreprise (Monthly)",
      "price_1TBi3DF3VvKmdn5GxgjBbhoe": "Essentiel (Annual)",
      "price_1TBi3bF3VvKmdn5G51dRztux": "Professionnel (Annual)",
      "price_1TBi4AF3VvKmdn5G1d7gKP8O": "Entreprise (Annual)",
    };

    // Fetch invoices from Stripe for this period
    const listParams: Stripe.InvoiceListParams = {
      created: { gte: createdGte, lte: createdLte },
      limit: 100,
    };
    if (statusFilter && statusFilter !== "all") {
      listParams.status = statusFilter as Stripe.InvoiceListParams["status"];
    }

    const invoices = await stripe.invoices.list(listParams);
    logStep("Fetched invoices from Stripe", { count: invoices.data.length });

    // Filter to real plan invoices only
    const realInvoices = invoices.data.filter((invoice) => {
      if (!invoice.lines?.data?.length) return false;
      return invoice.lines.data.some((line: any) =>
        line.price?.id && realPriceIds.has(line.price.id)
      );
    });

    // Get tenant mapping: email -> tenant name
    const { data: tenants } = await supabaseClient
      .from("tenants")
      .select("id, name, contact_email");

    const emailToTenant: Record<string, { id: string; name: string }> = {};
    for (const tenant of tenants || []) {
      if (tenant.contact_email) {
        emailToTenant[tenant.contact_email.toLowerCase()] = { id: tenant.id, name: tenant.name };
      }
    }

    // Also try profiles to match Stripe customer email to tenant
    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("email, tenant_id");

    const { data: allTenants } = await supabaseClient
      .from("tenants")
      .select("id, name");

    const tenantMap: Record<string, string> = {};
    for (const t of allTenants || []) {
      tenantMap[t.id] = t.name;
    }

    const emailToTenantViaProfile: Record<string, { id: string; name: string }> = {};
    for (const p of profiles || []) {
      if (p.email && p.tenant_id && tenantMap[p.tenant_id]) {
        emailToTenantViaProfile[p.email.toLowerCase()] = { id: p.tenant_id, name: tenantMap[p.tenant_id] };
      }
    }

    const formattedInvoices = realInvoices.map((invoice) => {
      const customerEmail = (invoice.customer_email || "").toLowerCase();
      const tenantInfo = emailToTenant[customerEmail] || emailToTenantViaProfile[customerEmail];

      let planName = "Unknown";
      for (const line of invoice.lines?.data || []) {
        if (line.price?.id && planNameMap[line.price.id]) {
          planName = planNameMap[line.price.id];
          break;
        }
      }

      return {
        id: invoice.id,
        number: invoice.number,
        customer_email: invoice.customer_email,
        customer_name: invoice.customer_name,
        church_name: tenantInfo?.name || invoice.customer_name || "Unknown",
        tenant_id: tenantInfo?.id || null,
        plan: planName,
        amount: (invoice.amount_paid || invoice.amount_due || 0) / 100,
        currency: invoice.currency,
        status: invoice.status,
        created: new Date(invoice.created * 1000).toISOString(),
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        attempt_count: invoice.attempt_count,
        next_payment_attempt: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
      };
    });

    // Summary stats
    const summary = {
      total: formattedInvoices.length,
      paid: formattedInvoices.filter(i => i.status === "paid").length,
      open: formattedInvoices.filter(i => i.status === "open").length,
      uncollectible: formattedInvoices.filter(i => i.status === "uncollectible").length,
      void: formattedInvoices.filter(i => i.status === "void").length,
      total_collected: formattedInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
      total_pending: formattedInvoices.filter(i => i.status === "open").reduce((s, i) => s + i.amount, 0),
    };

    logStep("Processed invoices", { summary });

    return new Response(JSON.stringify({ invoices: formattedInvoices, summary }), {
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
