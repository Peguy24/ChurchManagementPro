import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WEEKLY-DIGEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify cron secret
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logStep("Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    const resend = new Resend(resendApiKey);

    // Get super admin emails
    const { data: platformAdmins } = await supabase
      .from("platform_user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (!platformAdmins || platformAdmins.length === 0) {
      logStep("No super admins found");
      return new Response(JSON.stringify({ message: "No super admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const superAdminEmails: string[] = [];
    for (const admin of platformAdmins) {
      const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
      if (userData?.user?.email) {
        superAdminEmails.push(userData.user.email);
      }
    }

    if (superAdminEmails.length === 0) {
      logStep("No super admin emails found");
      return new Response(JSON.stringify({ message: "No emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found super admin emails", { count: superAdminEmails.length });

    // Calculate date range (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoStr = weekAgo.toISOString();

    // 1. New tenants this week
    const { data: newTenants, count: newTenantsCount } = await supabase
      .from("tenants")
      .select("name, contact_email, created_at", { count: "exact" })
      .gte("created_at", weekAgoStr)
      .order("created_at", { ascending: false });

    // 2. Active subscriptions & revenue
    const { data: activeSubs } = await supabase
      .from("tenant_subscriptions")
      .select("price_monthly, status");

    const totalMRR = activeSubs?.filter(s => s.status === "active").reduce((sum, s) => sum + (s.price_monthly || 0), 0) || 0;
    const activeCount = activeSubs?.filter(s => s.status === "active").length || 0;
    const trialCount = activeSubs?.filter(s => s.status === "trial").length || 0;

    // 3. Total tenants
    const { count: totalTenants } = await supabase
      .from("tenants")
      .select("*", { count: "exact", head: true });

    // 4. Open support tickets
    const { count: openTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]);

    // 5. Urgent tickets
    const { count: urgentTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("priority", "urgent")
      .in("status", ["open", "in_progress"]);

    // 6. New tickets this week
    const { count: newTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgoStr);

    // 7. Platform alerts
    const { count: unreadAlerts } = await supabase
      .from("platform_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    // Build new tenants list HTML
    const newTenantsHtml = (newTenants && newTenants.length > 0)
      ? newTenants.map(t => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${t.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${t.contact_email || '-'}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${new Date(t.created_at).toLocaleDateString('en-US')}</td>
        </tr>
      `).join('')
      : `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #9ca3af;">No new signups this week</td></tr>`;

    const weekStart = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">📊 Weekly Platform Digest</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">${weekStart} — ${weekEnd}</p>
        </div>

        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- KPI Cards -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
            <tr>
              <td width="50%" style="padding: 4px;">
                <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: 700; color: #16a34a;">$${totalMRR.toFixed(2)}</div>
                  <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">Monthly Revenue</div>
                </div>
              </td>
              <td width="50%" style="padding: 4px;">
                <div style="background: #eff6ff; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: 700; color: #2563eb;">${totalTenants || 0}</div>
                  <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">Total Churches</div>
                </div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding: 4px;">
                <div style="background: #fefce8; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: 700; color: #ca8a04;">${newTenantsCount || 0}</div>
                  <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">New Signups</div>
                </div>
              </td>
              <td width="50%" style="padding: 4px;">
                <div style="background: #faf5ff; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 28px; font-weight: 700; color: #7c3aed;">${activeCount}</div>
                  <div style="font-size: 12px; color: #4b5563; margin-top: 4px;">Active Subs (${trialCount} trial)</div>
                </div>
              </td>
            </tr>
          </table>

          <!-- Support Section -->
          <div style="background: #fff7ed; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 8px; font-size: 14px; color: #9a3412;">🎫 Support Overview</h3>
            <table width="100%">
              <tr>
                <td style="font-size: 13px; color: #4b5563;">Open tickets:</td>
                <td style="font-size: 13px; font-weight: 600; text-align: right;">${openTickets || 0}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #4b5563;">Urgent tickets:</td>
                <td style="font-size: 13px; font-weight: 600; text-align: right; color: ${(urgentTickets || 0) > 0 ? '#dc2626' : '#16a34a'};">${urgentTickets || 0}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #4b5563;">New this week:</td>
                <td style="font-size: 13px; font-weight: 600; text-align: right;">${newTickets || 0}</td>
              </tr>
              <tr>
                <td style="font-size: 13px; color: #4b5563;">Unread alerts:</td>
                <td style="font-size: 13px; font-weight: 600; text-align: right;">${unreadAlerts || 0}</td>
              </tr>
            </table>
          </div>

          <!-- New Tenants Table -->
          <h3 style="margin: 0 0 12px; font-size: 14px; color: #1f2937;">🆕 New Churches This Week</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Church</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Email</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 600;">Date</th>
              </tr>
            </thead>
            <tbody>
              ${newTenantsHtml}
            </tbody>
          </table>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">Church Manager Pro — Automated Weekly Digest</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send to all super admins
    for (const email of superAdminEmails) {
      await resend.emails.send({
        from: "Church Manager Pro <noreply@churchmanagementpro.com>",
        to: [email],
        subject: `📊 Weekly Digest: ${newTenantsCount || 0} new signups, $${totalMRR.toFixed(2)} MRR — ${weekEnd}`,
        html: emailHtml,
      });
    }

    logStep("Weekly digest sent", { recipients: superAdminEmails.length });

    return new Response(JSON.stringify({ 
      success: true, 
      recipients: superAdminEmails.length,
      stats: { newTenantsCount, totalMRR, activeCount, trialCount, openTickets }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
