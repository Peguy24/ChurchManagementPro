import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is super admin
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, message, announcementType, priority } = await req.json();

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Title and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all tenant admin emails
    const { data: tenantAdminRoles } = await supabase
      .from("tenant_user_roles")
      .select("user_id")
      .eq("role", "admin")
      .eq("is_approved", true);

    const adminUserIds = [...new Set((tenantAdminRoles || []).map((r: any) => r.user_id))];

    // Get emails from auth.users
    const adminEmails: string[] = [];
    for (const userId of adminUserIds) {
      const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(userId as string);
      if (adminUser?.email) {
        adminEmails.push(adminUser.email);
      }
    }

    // Also get platform super admins
    const { data: platformAdmins } = await supabase
      .from("platform_user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    for (const pa of (platformAdmins || [])) {
      const { data: { user: paUser } } = await supabase.auth.admin.getUserById(pa.user_id);
      if (paUser?.email && !adminEmails.includes(paUser.email)) {
        adminEmails.push(paUser.email);
      }
    }

    // Also get legacy admins from user_roles
    const { data: legacyAdmins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    for (const la of (legacyAdmins || [])) {
      const { data: { user: laUser } } = await supabase.auth.admin.getUserById(la.user_id);
      if (laUser?.email && !adminEmails.includes(laUser.email)) {
        adminEmails.push(laUser.email);
      }
    }

    let emailsSent = 0;

    // Send emails via Resend if configured
    if (resendApiKey && adminEmails.length > 0) {
      const priorityLabel = priority === "critical" ? "🔴 CRITICAL" : priority === "high" ? "🟠 HIGH" : "";
      const typeLabel = announcementType === "maintenance" ? "🔧 Maintenance" :
                        announcementType === "new_feature" ? "🚀 New Feature" :
                        announcementType === "update" ? "📦 Platform Update" : "📢 Announcement";

      // Send in batches of 50
      const batchSize = 50;
      for (let i = 0; i < adminEmails.length; i += batchSize) {
        const batch = adminEmails.slice(i, i + batchSize);
        
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Church Management Pro <noreply@churchmanagementpro.com>",
            to: batch,
            subject: `${priorityLabel ? priorityLabel + " - " : ""}${typeLabel}: ${title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px;">Church Management Pro</h1>
                  <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">${typeLabel}</p>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
                  ${priorityLabel ? `<div style="background: ${priority === 'critical' ? '#fef2f2' : '#fff7ed'}; border-left: 4px solid ${priority === 'critical' ? '#ef4444' : '#f97316'}; padding: 12px; margin-bottom: 20px; border-radius: 4px;">${priorityLabel}</div>` : ""}
                  <h2 style="color: #1a1a2e; margin-top: 0;">${title}</h2>
                  <div style="color: #374151; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</div>
                </div>
                <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
                  This is an automated message from Church Management Pro platform.
                </div>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          emailsSent += batch.length;
        }
      }
    }

    // Save announcement record
    await supabase.from("platform_announcements").insert({
      title,
      message,
      announcement_type: announcementType || "general",
      priority: priority || "normal",
      sent_at: new Date().toISOString(),
      sent_by: user.id,
      recipient_count: emailsSent || adminEmails.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipientCount: adminEmails.length,
        emailsSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending bulk announcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
