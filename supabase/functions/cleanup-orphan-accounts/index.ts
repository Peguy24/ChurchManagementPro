import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isSuperAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) return json({ error: "Forbidden: Super Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const emailFilter: string[] | null = Array.isArray(body?.emails)
      ? body.emails.map((e: string) => e.toLowerCase())
      : null;

    const removed: string[] = [];
    const kept: string[] = [];

    let page = 1;
    const perPage = 200;
    while (page <= 50) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage });
      const users = list?.users || [];
      if (users.length === 0) break;

      for (const u of users) {
        const email = u.email?.toLowerCase() ?? "";
        if (emailFilter && !emailFilter.includes(email)) continue;
        if (u.id === user.id) continue;

        // Keep platform staff
        const { data: pr } = await admin
          .from("platform_user_roles")
          .select("role")
          .eq("user_id", u.id)
          .maybeSingle();
        if (pr) { kept.push(email); continue; }

        const { data: po } = await admin
          .from("platform_owners")
          .select("id")
          .eq("user_id", u.id)
          .maybeSingle();
        if (po) { kept.push(email); continue; }

        // Keep anyone still attached to a church
        const { data: tr } = await admin
          .from("tenant_user_roles")
          .select("tenant_id")
          .eq("user_id", u.id)
          .limit(1);
        if (tr && tr.length > 0) { kept.push(email); continue; }

        const { data: prof } = await admin
          .from("profiles")
          .select("tenant_id")
          .eq("id", u.id)
          .maybeSingle();
        if (prof?.tenant_id) { kept.push(email); continue; }

        if (dryRun) { removed.push(email); continue; }

        await admin.from("user_roles").delete().eq("user_id", u.id);
        await admin.from("profiles").delete().eq("id", u.id);
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        if (delErr) {
          console.log(`[CLEANUP-ORPHANS] failed ${email}: ${delErr.message}`);
          kept.push(email);
        } else {
          console.log(`[CLEANUP-ORPHANS] deleted orphan ${email}`);
          removed.push(email);
        }
      }

      if (users.length < perPage) break;
      page++;
    }

    return json({ success: true, dry_run: dryRun, removed_count: removed.length, removed, kept_count: kept.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[CLEANUP-ORPHANS] ERROR: ${msg}`);
    return json({ error: msg }, 500);
  }
});
