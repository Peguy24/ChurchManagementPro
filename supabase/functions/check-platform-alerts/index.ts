import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller: either CRON_SECRET or super admin JWT
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (authHeader !== cronSecret) {
      // Check if it's a super admin JWT
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader || "");
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const now = new Date();
    const notifications: any[] = [];

    // ============================
    // 1. Trials expiring in 3 days
    // ============================
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringTrials } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, trial_ends_at, tenants(name, contact_email)")
      .eq("status", "trial")
      .lte("trial_ends_at", threeDaysFromNow)
      .gt("trial_ends_at", now.toISOString());

    for (const trial of expiringTrials || []) {
      const tenantName = (trial as any).tenants?.name || "Unknown";
      const daysLeft = Math.ceil(
        (new Date(trial.trial_ends_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we already have a recent notification for this
      const { count } = await supabase
        .from("platform_notifications")
        .select("*", { count: "exact", head: true })
        .eq("notification_type", "trial_expiring")
        .eq("tenant_id", trial.tenant_id)
        .gte("created_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      if ((count || 0) === 0) {
        notifications.push({
          notification_type: "trial_expiring",
          severity: daysLeft <= 1 ? "critical" : "warning",
          title: `Trial expiring: ${tenantName}`,
          message: `${tenantName}'s trial expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Contact: ${(trial as any).tenants?.contact_email || "N/A"}`,
          tenant_id: trial.tenant_id,
          metadata: {
            trial_ends_at: trial.trial_ends_at,
            days_left: daysLeft,
            contact_email: (trial as any).tenants?.contact_email,
          },
        });
      }
    }

    // ============================
    // 2. Expired trials (just expired, not yet notified)
    // ============================
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: justExpiredTrials } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, trial_ends_at, tenants(name, contact_email)")
      .eq("status", "trial")
      .lte("trial_ends_at", now.toISOString())
      .gte("trial_ends_at", oneDayAgo);

    for (const trial of justExpiredTrials || []) {
      const tenantName = (trial as any).tenants?.name || "Unknown";

      const { count } = await supabase
        .from("platform_notifications")
        .select("*", { count: "exact", head: true })
        .eq("notification_type", "trial_expired")
        .eq("tenant_id", trial.tenant_id)
        .gte("created_at", oneDayAgo);

      if ((count || 0) === 0) {
        notifications.push({
          notification_type: "trial_expired",
          severity: "critical",
          title: `Trial expired: ${tenantName}`,
          message: `${tenantName}'s trial has expired. They need to subscribe to continue using the platform.`,
          tenant_id: trial.tenant_id,
          metadata: {
            trial_ends_at: trial.trial_ends_at,
            contact_email: (trial as any).tenants?.contact_email,
          },
        });
      }
    }

    // ============================
    // 3. Inactive tenants (no attendance/donation activity in 30+ days)
    // ============================
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: activeTenants } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, tenants(name, contact_email)")
      .in("status", ["active", "trial"]);

    for (const sub of activeTenants || []) {
      const tid = sub.tenant_id;

      // Check for recent activity (attendance or donations)
      const { count: attendanceCount } = await supabase
        .from("attendance_records")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tid)
        .gte("event_date", thirtyDaysAgo);

      const { count: donationCount } = await supabase
        .from("donations")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tid)
        .gte("donation_date", thirtyDaysAgo);

      if ((attendanceCount || 0) === 0 && (donationCount || 0) === 0) {
        // Check if we already notified recently (within 7 days)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: existingNotif } = await supabase
          .from("platform_notifications")
          .select("*", { count: "exact", head: true })
          .eq("notification_type", "tenant_inactive")
          .eq("tenant_id", tid)
          .gte("created_at", sevenDaysAgo);

        if ((existingNotif || 0) === 0) {
          const tenantName = (sub as any).tenants?.name || "Unknown";
          notifications.push({
            notification_type: "tenant_inactive",
            severity: "info",
            title: `Inactive tenant: ${tenantName}`,
            message: `${tenantName} has had no attendance or donation activity in the last 30 days.`,
            tenant_id: tid,
            metadata: {
              contact_email: (sub as any).tenants?.contact_email,
              last_checked: now.toISOString(),
            },
          });
        }
      }
    }

    // ============================
    // 4. Suspended/cancelled subscriptions (payment issues)
    // ============================
    const { data: problemSubs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, status, tenants(name, contact_email)")
      .in("status", ["suspended", "cancelled"]);

    for (const sub of problemSubs || []) {
      const tenantName = (sub as any).tenants?.name || "Unknown";

      // Only notify once per week for ongoing payment issues
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("platform_notifications")
        .select("*", { count: "exact", head: true })
        .eq("notification_type", "payment_issue")
        .eq("tenant_id", sub.tenant_id)
        .gte("created_at", sevenDaysAgo);

      if ((count || 0) === 0) {
        notifications.push({
          notification_type: "payment_issue",
          severity: "critical",
          title: `Payment issue: ${tenantName}`,
          message: `${tenantName}'s subscription is ${sub.status}. Contact: ${(sub as any).tenants?.contact_email || "N/A"}`,
          tenant_id: sub.tenant_id,
          metadata: {
            subscription_status: sub.status,
            contact_email: (sub as any).tenants?.contact_email,
          },
        });
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertErr } = await supabase
        .from("platform_notifications")
        .insert(notifications);
      if (insertErr) throw insertErr;
    }

    // Send email summary to super admins if there are critical notifications
    const criticalNotifs = notifications.filter((n) => n.severity === "critical");
    if (criticalNotifs.length > 0) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        // Get super admin emails
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles && adminRoles.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id")
            .in("id", adminRoles.map((r) => r.user_id));

          // Get emails from auth.users via admin API
          const adminEmails: string[] = [];
          for (const profile of profiles || []) {
            const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
            if (user?.email) adminEmails.push(user.email);
          }

          if (adminEmails.length > 0) {
            const emailBody = criticalNotifs
              .map((n) => `<li><strong>${n.title}</strong><br/>${n.message}</li>`)
              .join("");

            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
              },
              body: JSON.stringify({
                from: "Church Manager Pro <noreply@churchmanagementpro.com>",
                to: adminEmails,
                subject: `⚠️ ${criticalNotifs.length} Critical Platform Alert${criticalNotifs.length > 1 ? "s" : ""}`,
                html: `
                  <h2>Platform Alerts Summary</h2>
                  <p>The following critical alerts require your attention:</p>
                  <ul>${emailBody}</ul>
                  <p><a href="https://cogmpw-sys.lovable.app/super-admin">View Dashboard</a></p>
                `,
              }),
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, created: notifications.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
