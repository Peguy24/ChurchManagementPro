import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { domain_id } = await req.json();
    if (!domain_id) return json({ error: "domain_id required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: dom, error } = await supabase
      .from("tenant_domains")
      .select("*")
      .eq("id", domain_id)
      .maybeSingle();
    if (error || !dom) return json({ error: "domain not found" }, 404);
    if (dom.kind !== "custom") return json({ error: "subdomains are auto-verified" }, 400);
    if (!dom.verification_token) return json({ error: "no verification token" }, 400);

    const record = `_cmp-verify.${dom.hostname}`;
    let verified = false;
    try {
      const txts = await Deno.resolveDns(record, "TXT");
      const flat = txts.map((chunks) => chunks.join("")).map((s) => s.trim());
      verified = flat.some((v) => v === dom.verification_token);
    } catch (_e) {
      verified = false;
    }

    const patch = verified
      ? { status: "active", last_verified_at: new Date().toISOString(), error_message: null }
      : { status: "pending", error_message: "TXT record not found or mismatched" };

    await supabase.from("tenant_domains").update(patch).eq("id", domain_id);

    return json({ verified, checked_record: record });
  } catch (e: any) {
    return json({ error: e?.message || "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
