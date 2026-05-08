import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-INVOICES] ${step}${detailsStr}`);
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning empty invoices");
      return new Response(JSON.stringify({ invoices: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Real price IDs (monthly + yearly) - both old and new
    const realPriceIds = new Set([
      "price_1SsxZvF3VvKmdn5Gokml3EOt", // Essentiel monthly (old)
      "price_1Ssxa9F3VvKmdn5GGE0wSfBk", // Professionnel monthly (old)
      "price_1SsxaeF3VvKmdn5G8aP7l7GE", // Entreprise monthly (old)
      "price_1TBi3DF3VvKmdn5GxgjBbhoe", // Essentiel yearly (old)
      "price_1TBi3bF3VvKmdn5G51dRztux", // Professionnel yearly (old)
      "price_1TBi4AF3VvKmdn5G1d7gKP8O", // Entreprise yearly (old)
      "price_1TUhjWFTm4C7ouBeeJJFjU6H", // Essentiel monthly (new)
      "price_1TUhkAFTm4C7ouBe4gEfoISY", // Professionnel monthly (new)
      "price_1TUhkXFTm4C7ouBegvYgbfhy", // Entreprise monthly (new)
      "price_1TUhlxFTm4C7ouBe3XTZHbE5", // Essentiel yearly (new)
      "price_1TUhmQFTm4C7ouBeuvlNyb6t", // Professionnel yearly (new)
      "price_1TUhnEFTm4C7ouBeA4qdh6Qd", // Entreprise yearly (new)
    ]);

    // Get invoices for this customer
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 20,
    });

    // Filter out test invoices (only keep invoices with real price IDs)
    const realInvoices = invoices.data.filter((invoice: Stripe.Invoice) => {
      if (!invoice.lines?.data?.length) return false;
      return invoice.lines.data.some((line: any) => 
        line.price?.id && realPriceIds.has(line.price.id)
      );
    });

    const formattedInvoices = realInvoices.map((invoice: Stripe.Invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      created: new Date(invoice.created * 1000).toISOString(),
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
    }));

    logStep("Retrieved invoices", { count: formattedInvoices.length });

    return new Response(JSON.stringify({ invoices: formattedInvoices }), {
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
