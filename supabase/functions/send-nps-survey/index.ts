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

const APP_URL = Deno.env.get("APP_URL") || "https://churchmanagementpro.com";
const DAYS = 90;

const currentCycle = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
};

function template(lang: string, firstName: string, tenantName: string) {
  const t = {
    en: {
      subj: `How likely would you recommend ${tenantName ? "us" : "Church Management Pro"}?`,
      hi: `Hi ${firstName || "there"},`,
      body: "We'd love your quick feedback. On a scale of 0–10, how likely are you to recommend Church Management Pro to another church?",
      cta: "Give a score",
      foot: "Takes 10 seconds. You'll only get this once per quarter.",
    },
    fr: {
      subj: `Nous recommanderiez-vous ?`,
      hi: `Bonjour ${firstName || ""},`,
      body: "Nous aimerions votre avis. Sur une échelle de 0 à 10, quelle est la probabilité que vous recommandiez Church Management Pro à une autre église ?",
      cta: "Donner une note",
      foot: "Ça prend 10 secondes. Vous ne recevrez ceci qu'une fois par trimestre.",
    },
    ht: {
      subj: `Èske w ta rekòmande nou?`,
      hi: `Bonjou ${firstName || ""},`,
      body: "Nou ta renmen konnen opinyon w. Sou yon echèl 0 a 10, ki chans w ap rekòmande Church Management Pro bay yon lòt legliz?",
      cta: "Bay yon nòt",
      foot: "Li pran 10 segond. W ap resevwa sa yon sèl fwa chak trimès.",
    },
  }[lang] || undefined;
  return t || {
    subj: "How likely would you recommend us?",
    hi: `Hi ${firstName || "there"},`,
    body: "On a scale of 0–10, how likely are you to recommend Church Management Pro?",
    cta: "Give a score",
    foot: "Takes 10 seconds.",
  };
}

function renderHtml(lang: string, firstName: string, tenantName: string) {
  const t = template(lang, firstName, tenantName);
  const scores = Array.from({ length: 11 }, (_, i) => i);
  const buttons = scores
    .map((n) => {
      const color = n <= 6 ? "#dc2626" : n <= 8 ? "#f59e0b" : "#16a34a";
      return `<a href="${APP_URL}/?nps=${n}" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;margin:2px;background:${color};color:#fff;text-decoration:none;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:600">${n}</a>`;
    })
    .join("");

  return {
    subject: t.subj,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff">
        <h2 style="color:#111827;margin:0 0 12px">${t.hi}</h2>
        <p style="color:#374151;line-height:1.6">${t.body}</p>
        <div style="text-align:center;margin:20px 0">${buttons}</div>
        <p style="color:#6b7280;font-size:12px;text-align:center;margin-top:24px">${t.foot}</p>
      </div>`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUserId: string | undefined = body?.user_id;

    // Verify caller is super admin unless triggered by cron (Authorization: Bearer <service key>)
    const auth = req.headers.get("authorization") || "";
    const isServiceRole = auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "___never___");
    if (!isServiceRole) {
      const { data: userData } = await admin.auth.getUser(auth.replace("Bearer ", ""));
      const uid = userData?.user?.id;
      if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
      const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: uid });
      if (!isSuper) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const cycle = currentCycle();
    const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString();

    // Eligible tenant admins
    let query = admin
      .from("tenant_user_roles")
      .select("user_id, tenant_id, profiles!inner(email, first_name, language), tenants(name)")
      .eq("role", "admin")
      .eq("is_approved", true);
    if (targetUserId) query = query.eq("user_id", targetUserId);
    const { data: admins } = await query;

    let sent = 0;
    let skipped = 0;
    for (const row of admins || []) {
      const uid = row.user_id;
      const email = (row as any).profiles?.email;
      const first = (row as any).profiles?.first_name || "";
      const lang = (row as any).profiles?.language || "en";
      const tenantName = (row as any).tenants?.name || "";
      if (!email) { skipped++; continue; }

      // Already emailed this cycle?
      const { data: alreadyEmail } = await admin
        .from("nps_email_sends")
        .select("id").eq("user_id", uid).eq("survey_cycle", cycle).maybeSingle();
      if (alreadyEmail) { skipped++; continue; }

      // Already submitted recently?
      const { data: last } = await admin
        .from("nps_surveys")
        .select("submitted_at").eq("user_id", uid)
        .order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      if (last && new Date(last.submitted_at).toISOString() > cutoff) { skipped++; continue; }

      const { subject, html } = renderHtml(lang, first, tenantName);
      try {
        await resend.emails.send({
          from: "Church Management Pro <noreply@churchmanagementpro.com>",
          to: [email],
          subject,
          html,
        });
        await admin.from("nps_email_sends").insert({ user_id: uid, tenant_id: row.tenant_id, survey_cycle: cycle });
        sent++;
      } catch (e) {
        console.error(`Send failed for ${email}`, e);
        skipped++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped, cycle }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-nps-survey error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
