import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, transactionId } = await req.json();
    if (!slug || !transactionId) {
      return new Response(JSON.stringify({ error: "Missing params" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: tenant } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!tenant) return new Response(JSON.stringify({ error: "Tenant not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: settings } = await admin
      .from("tenant_giving_settings")
      .select("*")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (!settings?.moncash_client_id || !settings?.moncash_client_secret) {
      return new Response(JSON.stringify({ error: "MonCash not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isLive = settings.moncash_env === "live";
    const apiBase = isLive
      ? "https://moncashbutton.digicelgroup.com/Api"
      : "https://sandbox.moncashbutton.digicelgroup.com/Api";

    const basic = btoa(`${settings.moncash_client_id}:${settings.moncash_client_secret}`);
    const tokenRes = await fetch(`${apiBase}/oauth/token?grant_type=client_credentials&scope=read,write`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
    });
    if (!tokenRes.ok) throw new Error("MonCash auth failed");
    const accessToken = (await tokenRes.json()).access_token;

    const retRes = await fetch(`${apiBase}/v1/RetrieveTransactionPayment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ transactionId }),
    });
    if (!retRes.ok) {
      const t = await retRes.text();
      console.error("Retrieve failed", retRes.status, t);
      return new Response(JSON.stringify({ error: "Verification failed", details: t }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const retJson = await retRes.json();
    const payment = retJson?.payment;
    if (!payment || payment.message !== "successful") {
      return new Response(JSON.stringify({ error: "Payment not successful" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orderId = payment.reference;
    const amount = Number(payment.cost);

    // Find pending donation
    const { data: pendings } = await admin
      .from("donations")
      .select("id, notes")
      .eq("tenant_id", tenant.id)
      .eq("payment_method", "moncash")
      .like("notes", `%${orderId}%`)
      .limit(1);
    const pending = pendings?.[0];

    if (pending) {
      let parsedNotes: any = {};
      try { parsedNotes = JSON.parse(pending.notes || "{}"); } catch {}
      if (parsedNotes.status === "confirmed") {
        return new Response(JSON.stringify({ ok: true, already: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      parsedNotes.status = "confirmed";
      parsedNotes.transactionId = transactionId;

      const update: any = {
        description: `Online giving (MonCash)${parsedNotes.donor_name ? ` — ${parsedNotes.donor_name}` : ""}`,
        notes: JSON.stringify(parsedNotes),
      };
      if (settings.default_bank_account_id) update.bank_account_id = settings.default_bank_account_id;
      else if (settings.default_cash_register_id) update.cash_register_id = settings.default_cash_register_id;

      await admin.from("donations").update(update).eq("id", pending.id);

      // Balances
      if (settings.default_bank_account_id) {
        const { data: acct } = await admin.from("bank_accounts").select("current_balance").eq("id", settings.default_bank_account_id).maybeSingle();
        if (acct) await admin.from("bank_accounts").update({ current_balance: Number(acct.current_balance) + amount }).eq("id", settings.default_bank_account_id);
      } else if (settings.default_cash_register_id) {
        const { data: reg } = await admin.from("cash_registers").select("current_balance").eq("id", settings.default_cash_register_id).maybeSingle();
        if (reg) await admin.from("cash_registers").update({ current_balance: Number(reg.current_balance) + amount }).eq("id", settings.default_cash_register_id);
      }

      await admin.from("tenant_notifications").insert({
        tenant_id: tenant.id,
        notification_type: "new_donation",
        severity: "info",
        title: "new_online_donation",
        message: `amount:${amount}`,
        metadata: { amount, source: "online_giving_moncash" },
      });
    }

    return new Response(JSON.stringify({ ok: true, amount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("moncash-giving-verify error", err);
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
