import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lang = "en" | "fr" | "ht";

const DOC_LABEL: Record<Lang, Record<string, string>> = {
  en: { terms_of_use: "Terms of Use", privacy_policy: "Privacy Policy", payment_terms: "Payment Terms" },
  fr: { terms_of_use: "Conditions d'utilisation", privacy_policy: "Politique de confidentialité", payment_terms: "Conditions de paiement" },
  ht: { terms_of_use: "Kondisyon Itilizasyon", privacy_policy: "Politik Konfidansyalite", payment_terms: "Kondisyon Peman" },
};

const T: Record<Lang, any> = {
  en: {
    subject: (d: string) => `Update to our ${d}`,
    title: "Our policies have been updated",
    greeting: (n: string) => `Hello ${n},`,
    body: (d: string, v: number) =>
      `We have published a new version of our <strong>${d}</strong> (version ${v}). Please review it and confirm your acceptance the next time you sign in.`,
    note: "You will see a short notice inside your dashboard asking you to accept the updated document.",
    cta: "Read the updated document",
    footer: "Sent by Church Management Pro",
    fallbackName: "there",
  },
  fr: {
    subject: (d: string) => `Mise à jour de nos ${d}`,
    title: "Nos politiques ont été mises à jour",
    greeting: (n: string) => `Bonjour ${n},`,
    body: (d: string, v: number) =>
      `Nous avons publié une nouvelle version de nos <strong>${d}</strong> (version ${v}). Merci de les consulter et de confirmer votre acceptation lors de votre prochaine connexion.`,
    note: "Un court message apparaîtra dans votre tableau de bord pour vous demander d'accepter le document mis à jour.",
    cta: "Lire le document mis à jour",
    footer: "Envoyé par Church Management Pro",
    fallbackName: "cher administrateur",
  },
  ht: {
    subject: (d: string) => `Mizajou nan ${d} nou an`,
    title: "Politik nou yo mete ajou",
    greeting: (n: string) => `Bonjou ${n},`,
    body: (d: string, v: number) =>
      `Nou pibliye yon nouvo vèsyon <strong>${d}</strong> nou an (vèsyon ${v}). Tanpri li li epi konfime akseptasyon ou pwochèn fwa ou konekte.`,
    note: "Ou pral wè yon ti mesaj nan tablo debò ou k ap mande w aksepte dokiman ki mete ajou a.",
    cta: "Li dokiman an",
    footer: "Voye pa Church Management Pro",
    fallbackName: "chè administratè",
  },
};

const detectLang = (l?: string | null): Lang => {
  const x = (l || "").toLowerCase();
  return x === "fr" || x === "ht" ? (x as Lang) : "en";
};

const esc = (s: string) => String(s ?? "").replace(/<[^>]*>/g, "").slice(0, 120);

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Caller must be a signed-in super admin
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) return json({ error: "Unauthorized" }, 401);
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSuper) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const documentType = String(body?.documentType || "");
    if (!["terms_of_use", "privacy_policy", "payment_terms"].includes(documentType)) {
      return json({ error: "Invalid documentType" }, 400);
    }

    const { data: doc } = await supabase
      .from("legal_documents")
      .select("document_type, version")
      .eq("document_type", documentType)
      .maybeSingle();
    const version = Number(doc?.version || 1);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ success: false, error: "RESEND_API_KEY not set" });

    const { data: roles } = await supabase
      .from("tenant_user_roles")
      .select("user_id, tenant_id")
      .eq("role", "admin")
      .eq("is_approved", true);

    const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id).filter(Boolean)));
    if (!ids.length) return json({ success: true, sent: 0 });

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, language")
      .in("id", ids);
    const profById = new Map((profiles || []).map((p: any) => [p.id, p]));

    const ctaUrl = `https://churchmanagementpro.com/legal/${documentType}`;

    let sent = 0;
    for (const id of ids) {
      const { data: u } = await supabase.auth.admin.getUserById(id as string);
      const email = u?.user?.email;
      if (!email) continue;

      const p: any = profById.get(id as string);
      const lang = detectLang(p?.language);
      const tr = T[lang];
      const label = DOC_LABEL[lang][documentType];
      const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim() || tr.fallbackName;

      const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#4F46E5,#6366F1);padding:28px 20px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">${tr.title}</h1>
  </div>
  <div style="padding:28px 30px;">
    <p style="color:#334155;font-size:15px;margin:0 0 16px;">${tr.greeting(esc(name))}</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">${tr.body(label, version)}</p>
    <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 16px;">${tr.note}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:#4F46E5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${tr.cta}</a>
    </div>
  </div>
  <div style="background:#f8fafc;padding:14px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="color:#94a3b8;font-size:12px;margin:0;">${tr.footer}</p>
  </div>
</div></body></html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Church Management Pro <noreply@churchmanagementpro.com>",
          to: [email],
          subject: tr.subject(label),
          html,
        }),
      });
      if (res.ok) sent++;
      else console.error("resend error", await res.text());
    }

    return json({ success: true, sent, version });
  } catch (e: any) {
    console.error("[notify-policy-update]", e);
    return json({ error: e?.message || String(e) }, 500);
  }
});
