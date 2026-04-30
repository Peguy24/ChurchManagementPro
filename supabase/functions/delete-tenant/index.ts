import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the caller is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Super Admin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[DELETE-TENANT] Deleting tenant ${tenant_id} by user ${user.email}`);

    // ========== Collect every email associated with this tenant ==========
    const emailsToRelease = new Set<string>();
    const userIdsToCheck = new Set<string>();

    try {
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants")
        .select("contact_email")
        .eq("id", tenant_id)
        .maybeSingle();
      if (tenantRow?.contact_email) emailsToRelease.add(tenantRow.contact_email.toLowerCase());
    } catch (_e) {}

    try {
      const { data: invs } = await supabaseAdmin
        .from("admin_invitations")
        .select("email")
        .eq("tenant_id", tenant_id);
      (invs || []).forEach((r: any) => r.email && emailsToRelease.add(r.email.toLowerCase()));
    } catch (_e) {}

    try {
      const { data: reqs } = await supabaseAdmin
        .from("tenant_requests")
        .select("contact_email")
        .eq("created_tenant_id", tenant_id);
      (reqs || []).forEach((r: any) => r.contact_email && emailsToRelease.add(r.contact_email.toLowerCase()));
    } catch (_e) {}

    try {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("tenant_id", tenant_id);
      (profs || []).forEach((p: any) => {
        if (p.email) emailsToRelease.add(p.email.toLowerCase());
        if (p.id) userIdsToCheck.add(p.id);
      });
    } catch (_e) {}

    try {
      const { data: roles } = await supabaseAdmin
        .from("tenant_user_roles")
        .select("user_id")
        .eq("tenant_id", tenant_id);
      (roles || []).forEach((r: any) => r.user_id && userIdsToCheck.add(r.user_id));
    } catch (_e) {}

    console.log(`[DELETE-TENANT] Collected ${emailsToRelease.size} emails, ${userIdsToCheck.size} user ids`);

    // Delete in order to respect foreign keys
    const tables = [
      { table: "subscription_audit_logs", column: "tenant_id" },
      { table: "tenant_usage", column: "tenant_id" },
      { table: "pastoral_alerts", column: "tenant_id" },
      { table: "member_risk_predictions", column: "tenant_id" },
      { table: "member_engagement_scores", column: "tenant_id" },
      { table: "attendance_records", column: "tenant_id" },
      { table: "fund_transactions", column: "tenant_id" },
      { table: "special_funds", column: "tenant_id" },
      { table: "cash_transactions", column: "tenant_id" },
      { table: "cash_registers", column: "tenant_id" },
      { table: "bank_transactions", column: "bank_account_id", subquery: true },
      { table: "bank_accounts", column: "tenant_id" },
      { table: "inventory_usage", column: "item_id", subquery: true },
      { table: "inventory_maintenance", column: "tenant_id" },
      { table: "inventory_items", column: "tenant_id" },
      { table: "donations", column: "tenant_id" },
      { table: "expenses", column: "tenant_id" },
      { table: "budgets", column: "tenant_id" },
      { table: "expense_categories", column: "tenant_id" },
      { table: "income_categories", column: "tenant_id" },
      { table: "ministry_members", column: "ministry_id", subquery: true },
      { table: "ministries", column: "tenant_id" },
      { table: "member_documents", column: "member_id", subquery: true },
      { table: "members", column: "tenant_id" },
      { table: "member_requests", column: "tenant_id" },
      { table: "events", column: "tenant_id" },
      { table: "event_registrations", column: "tenant_id" },
      { table: "branches", column: "tenant_id" },
      { table: "church_settings", column: "tenant_id" },
      { table: "admin_invitations", column: "tenant_id" },
      { table: "tenant_requests", column: "created_tenant_id" },
      { table: "support_tickets", column: "tenant_id" },
      { table: "tenant_user_roles", column: "tenant_id" },
      { table: "tenant_subscriptions", column: "tenant_id" },
    ];

    for (const { table, column, subquery } of tables) {
      try {
        if (subquery && table === "bank_transactions") {
          const { data: bankAccounts } = await supabaseAdmin
            .from("bank_accounts")
            .select("id")
            .eq("tenant_id", tenant_id);
          if (bankAccounts?.length) {
            const ids = bankAccounts.map(a => a.id);
            await supabaseAdmin.from(table).delete().in("bank_account_id", ids);
          }
        } else if (subquery && table === "inventory_usage") {
          const { data: items } = await supabaseAdmin
            .from("inventory_items")
            .select("id")
            .eq("tenant_id", tenant_id);
          if (items?.length) {
            const ids = items.map(i => i.id);
            await supabaseAdmin.from(table).delete().in("item_id", ids);
          }
        } else if (subquery && table === "ministry_members") {
          const { data: ministries } = await supabaseAdmin
            .from("ministries")
            .select("id")
            .eq("tenant_id", tenant_id);
          if (ministries?.length) {
            const ids = ministries.map(m => m.id);
            await supabaseAdmin.from(table).delete().in("ministry_id", ids);
          }
        } else if (subquery && table === "member_documents") {
          const { data: members } = await supabaseAdmin
            .from("members")
            .select("id")
            .eq("tenant_id", tenant_id);
          if (members?.length) {
            const ids = members.map(m => m.id);
            await supabaseAdmin.from(table).delete().in("member_id", ids);
          }
        } else {
          await supabaseAdmin.from(table).delete().eq(column, tenant_id);
        }
        console.log(`[DELETE-TENANT] Cleaned ${table}`);
      } catch (err) {
        console.log(`[DELETE-TENANT] Warning cleaning ${table}: ${err}`);
      }
    }

    // Merge profiles directly tied to this tenant + any user_id collected earlier
    const { data: tenantProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant_id);
    (tenantProfiles || []).forEach((p: any) => p.id && userIdsToCheck.add(p.id));

    // Update profiles to remove tenant_id reference
    await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: null })
      .eq("tenant_id", tenant_id);

    // Delete each user's tenant artifacts and auth account if they have no other tenant role / platform role
    for (const userId of userIdsToCheck) {
      try {
        // Skip if user holds a platform role (e.g., super admin)
        const { data: platformRole } = await supabaseAdmin
          .from("platform_user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();
        if (platformRole) {
          console.log(`[DELETE-TENANT] Skipping platform user ${userId}`);
          continue;
        }

        // Remove tenant_user_roles for this tenant only (other tenants preserved)
        await supabaseAdmin
          .from("tenant_user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("tenant_id", tenant_id);

        // If they still have roles in OTHER tenants, keep the auth user
        const { data: otherRoles } = await supabaseAdmin
          .from("tenant_user_roles")
          .select("tenant_id")
          .eq("user_id", userId)
          .limit(1);
        if (otherRoles && otherRoles.length > 0) {
          console.log(`[DELETE-TENANT] User ${userId} still has roles in other tenants, keeping auth user`);
          continue;
        }

        // Fully orphaned -> remove user_roles, profile, then auth user
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("id", userId);
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          console.log(`[DELETE-TENANT] Warning deleting auth user ${userId}: ${authDeleteError.message}`);
        } else {
          console.log(`[DELETE-TENANT] Auth user ${userId} deleted`);
        }
      } catch (err) {
        console.log(`[DELETE-TENANT] Error processing user ${userId}: ${err}`);
      }
    }

    // Clean up any orphan rows referencing the released emails
    if (emailsToRelease.size > 0) {
      const emails = Array.from(emailsToRelease);
      try {
        await supabaseAdmin.from("admin_invitations").delete().in("email", emails);
      } catch (_e) {}
      try {
        await supabaseAdmin.from("tenant_requests").delete().in("contact_email", emails);
      } catch (_e) {}

      // Sweep auth users by email — paginate and delete fully-orphaned matches
      try {
        let page = 1;
        const perPage = 200;
        while (true) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          const users = list?.users || [];
          if (users.length === 0) break;
          for (const u of users) {
            const em = u.email?.toLowerCase();
            if (!em || !emailsToRelease.has(em)) continue;
            // Skip if has platform role or any tenant role
            const { data: pr } = await supabaseAdmin
              .from("platform_user_roles")
              .select("role")
              .eq("user_id", u.id)
              .maybeSingle();
            if (pr) continue;
            const { data: tr } = await supabaseAdmin
              .from("tenant_user_roles")
              .select("tenant_id")
              .eq("user_id", u.id)
              .limit(1);
            if (tr && tr.length > 0) continue;
            await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id);
            await supabaseAdmin.from("profiles").delete().eq("id", u.id);
            const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(u.id);
            if (delErr) {
              console.log(`[DELETE-TENANT] Sweep: failed to delete ${u.id}: ${delErr.message}`);
            } else {
              console.log(`[DELETE-TENANT] Sweep: deleted orphan auth user ${u.id} (${em})`);
            }
          }
          if (users.length < perPage) break;
          page++;
          if (page > 50) break; // safety cap
        }
      } catch (sweepErr) {
        console.log(`[DELETE-TENANT] Email sweep warning: ${sweepErr}`);
      }
    }

    // Finally delete the tenant itself
    const { error: deleteError } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenant_id);

    if (deleteError) throw deleteError;

    console.log(`[DELETE-TENANT] Tenant ${tenant_id} deleted successfully (${emailsToRelease.size} emails released)`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE-TENANT] ERROR: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
