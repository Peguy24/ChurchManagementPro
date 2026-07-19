import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

// Stripe webhook — signature verified, no CORS/JWT
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_GIVING_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" as any });
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch (err: any) {
    console.error("Signature verification failed", err?.message);
    return new Response(`Invalid signature: ${err?.message}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};
      if (meta.source !== "online_giving") {
        return new Response("ok", { status: 200 });
      }
      const tenantId = meta.tenant_id;
      const amount = (session.amount_total ?? 0) / 100;
      const donorEmail = meta.donor_email || session.customer_email || "";
      const donorName = meta.donor_name || "";
      const message = meta.message || "";
      const lang = (meta.language || "en") as "en" | "fr" | "ht";

      // Load default accounts
      const { data: settings } = await admin
        .from("tenant_giving_settings")
        .select("default_cash_register_id, default_bank_account_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      const notes = JSON.stringify({ donor_name: donorName, donor_email: donorEmail, message, stripe_session: session.id });

      const donationRow: any = {
        tenant_id: tenantId,
        amount,
        donation_type: "online",
        payment_method: "card",
        donation_date: new Date().toISOString().slice(0, 10),
        description: `Online giving${donorName ? ` — ${donorName}` : ""}`,
        notes,
      };
      if (settings?.default_bank_account_id) donationRow.bank_account_id = settings.default_bank_account_id;
      else if (settings?.default_cash_register_id) donationRow.cash_register_id = settings.default_cash_register_id;

      const { error: insErr } = await admin.from("donations").insert(donationRow);
      if (insErr) console.error("donation insert failed", insErr);

      // Update balances
      if (settings?.default_bank_account_id) {
        const { data: acct } = await admin.from("bank_accounts").select("current_balance").eq("id", settings.default_bank_account_id).maybeSingle();
        if (acct) {
          await admin.from("bank_accounts").update({ current_balance: Number(acct.current_balance) + amount }).eq("id", settings.default_bank_account_id);
        }
      } else if (settings?.default_cash_register_id) {
        const { data: reg } = await admin.from("cash_registers").select("current_balance").eq("id", settings.default_cash_register_id).maybeSingle();
        if (reg) {
          await admin.from("cash_registers").update({ current_balance: Number(reg.current_balance) + amount }).eq("id", settings.default_cash_register_id);
        }
      }

      // Platform + tenant notifications
      await admin.from("tenant_notifications").insert({
        tenant_id: tenantId,
        notification_type: "new_donation",
        severity: "info",
        title: "new_online_donation",
        message: `amount:${amount}`,
        metadata: { amount, donor_email: donorEmail, source: "online_giving" },
      });

      // Confirmation email
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (RESEND_API_KEY && LOVABLE_API_KEY && donorEmail) {
        const subj = { en: "Thank you for your gift", fr: "Merci pour votre don", ht: "Mèsi pou don ou" }[lang] || "Thank you";
        const bodyMsg = {
          en: `Thank you${donorName ? ` ${donorName}` : ""}, we received your gift of ${amount}. God bless you.`,
          fr: `Merci${donorName ? ` ${donorName}` : ""}, nous avons reçu votre don de ${amount}. Que Dieu vous bénisse.`,
          ht: `Mèsi${donorName ? ` ${donorName}` : ""}, nou resevwa don ou ${amount}. Bondye beni ou.`,
        }[lang];
        try {
          await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: "Church Management Pro <noreply@churchmanagementpro.com>",
              to: [donorEmail],
              subject: subj,
              html: `<p>${bodyMsg}</p>`,
            }),
          });
        } catch (e) {
          console.error("email send failed", e);
        }
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("webhook handler error", err);
    return new Response(`error: ${err?.message}`, { status: 500 });
  }
});
