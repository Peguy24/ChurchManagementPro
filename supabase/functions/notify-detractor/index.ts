import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { survey_id } = await req.json();
    if (!survey_id) return new Response(JSON.stringify({ error: "survey_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const { data: survey } = await admin
      .from("nps_surveys")
      .select("id, score, comment, submitted_at, tenant_id, tenants(name)")
      .eq("id", survey_id)
      .maybeSingle();
    if (!survey || survey.score > 6) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const tenantName = (survey as any).tenants?.name || "Unknown church";
    const subject = `⚠️ NPS Detractor (${survey.score}/10) — ${tenantName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px">
        <h2 style="color:#dc2626">New NPS detractor feedback</h2>
        <p><strong>Church:</strong> ${esc(tenantName)}</p>
        <p><strong>Score:</strong> ${survey.score}/10</p>
        ${survey.comment ? `<p><strong>Comment:</strong></p><blockquote style="border-left:3px solid #dc2626;padding-left:12px;color:#374151">${esc(survey.comment)}</blockquote>` : ""}
        <p style="color:#6b7280;font-size:13px">A high-priority support ticket has been auto-created.</p>
      </div>`;

    // Recipients
    const { data: recips } = await admin.rpc("get_nps_detractor_email_recipients");
    const emails = (recips ?? []).map((r: any) => r.email).filter(Boolean);
    if (emails.length > 0) {
      await resend.emails.send({
        from: "Church Management Pro <noreply@churchmanagementpro.com>",
        to: emails,
        subject,
        html,
      });
    }

    // Optional Slack
    const slackUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (slackUrl) {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ NPS Detractor (${survey.score}/10) — ${tenantName}\n${survey.comment ?? ""}`,
        }),
      }).catch((e) => console.error("Slack webhook failed", e));
    }

    return new Response(JSON.stringify({ ok: true, notified: emails.length }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-detractor error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
