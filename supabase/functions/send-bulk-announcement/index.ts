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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verify user via getClaims
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify super admin
    const { data: isSuperAdmin } = await supabase.rpc("is_super_admin", { _user_id: userId });
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

    const adminEmails: string[] = [];
    for (const uid of adminUserIds) {
      const { data: { user: adminUser } } = await supabase.auth.admin.getUserById(uid as string);
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

    // Also get legacy admins
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

    if (resendApiKey && adminEmails.length > 0) {
      const priorityLabel = priority === "critical" ? "🔴 CRITICAL" : priority === "high" ? "🟠 HIGH" : "";
      const typeLabel = announcementType === "maintenance" ? "🔧 Maintenance" :
                        announcementType === "new_feature" ? "🚀 New Feature" :
                        announcementType === "update" ? "📦 Platform Update" : "📢 Announcement";

      // Send individual emails with rate limiting (max 2/sec for Resend)
      for (let i = 0; i < adminEmails.length; i++) {
        const recipientEmail = adminEmails[i];

        // Add delay before every email (except first) to respect Resend's 2 req/sec rate limit
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }

        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "Church Management Pro <noreply@churchmanagementpro.com>",
              to: [recipientEmail],
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
            emailsSent++;
          } else {
            const errBody = await emailRes.text();
            console.error("Resend error for", recipientEmail, ":", errBody);
          }
        } catch (emailErr) {
          console.error("Failed to send to", recipientEmail, ":", emailErr);
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
      sent_by: userId,
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
