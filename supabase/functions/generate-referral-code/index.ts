import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Auth failed");

    const userId = userData.user.id;

    // Get tenant
    const { data: profile } = await supa.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("No tenant");

    // Verify admin role
    const { data: isAdmin } = await supa.rpc("is_tenant_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Admin required");

    // Existing?
    const { data: existing } = await supa
      .from("referral_codes")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ code: existing.code, is_active: existing.is_active }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate
    const { data: codeStr, error: genErr } = await supa.rpc("generate_referral_code_for_tenant", { _tenant_id: tenantId });
    if (genErr) throw genErr;

    const { data: inserted, error: insErr } = await supa
      .from("referral_codes")
      .insert({ tenant_id: tenantId, code: codeStr })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ code: inserted.code, is_active: inserted.is_active }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
