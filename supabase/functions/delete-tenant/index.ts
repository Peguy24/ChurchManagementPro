import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Update profiles to remove tenant_id reference
    await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: null })
      .eq("tenant_id", tenant_id);

    // Finally delete the tenant itself
    const { error: deleteError } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenant_id);

    if (deleteError) throw deleteError;

    console.log(`[DELETE-TENANT] Tenant ${tenant_id} deleted successfully`);

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
