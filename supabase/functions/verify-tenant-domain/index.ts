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

    const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: userData } = await supabase.auth.getUser(token);
    const caller = userData?.user;
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: dom, error } = await supabase
      .from("tenant_domains")
      .select("*")
      .eq("id", domain_id)
      .maybeSingle();
    if (error || !dom) return json({ error: "domain not found" }, 404);

    // Only an admin of the owning church (or a platform super admin) may verify it.
    const { data: isSuper } = await supabase.rpc("is_super_admin", { _user_id: caller.id });
    if (!isSuper) {
      const { data: isAdmin } = await supabase.rpc("has_tenant_role", {
        _user_id: caller.id,
        _tenant_id: dom.tenant_id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }
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
