import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { detectLang, eventReminderTranslations, formatServiceDate } from "../_shared/email-translations.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  const bearerToken = authHeader?.replace("Bearer ", "");
  const isAuthorized = bearerToken && (
    (expectedSecret && bearerToken === expectedSecret) ||
    (serviceRoleKey && bearerToken === serviceRoleKey)
  );
  
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    console.log("Starting event reminder check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tomorrow's date in YYYY-MM-DD format
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Query ACTUAL events scheduled for tomorrow across all tenants
    const { data: upcomingEvents, error: eventsError } = await supabaseClient
      .from("events")
      .select("id, name, event_date, event_time, location, tenant_id, tenants(name)")
      .eq("event_date", tomorrowStr)
      .in("status", ["planned", "active", "confirmed"]);

    if (eventsError) {
      console.error("Error fetching upcoming events:", eventsError);
      throw eventsError;
    }

    if (!upcomingEvents || upcomingEvents.length === 0) {
      console.log("No events scheduled for tomorrow, skipping reminders");
      return new Response(JSON.stringify({ message: "No events scheduled for tomorrow" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log(`Found ${upcomingEvents.length} events scheduled for tomorrow (${tomorrowStr})`);

    let totalSuccess = 0;
    let totalError = 0;

    // Group events by tenant_id for efficient processing
    const eventsByTenant: Record<string, typeof upcomingEvents> = {};
    for (const event of upcomingEvents) {
      if (!eventsByTenant[event.tenant_id]) {
        eventsByTenant[event.tenant_id] = [];
      }
      eventsByTenant[event.tenant_id].push(event);
    }

    for (const [tenantId, tenantEvents] of Object.entries(eventsByTenant)) {
      const tenantName = (tenantEvents[0] as any).tenants?.name || "Church";
      console.log(`Processing ${tenantEvents.length} event(s) for tenant: ${tenantName}`);

      // Check if event reminder automation is enabled for this tenant
      const { data: automationSetting } = await supabaseClient
        .from("church_settings")
        .select("setting_value")
        .eq("tenant_id", tenantId)
        .eq("setting_key", "automation_event_reminder")
        .maybeSingle();

      if (automationSetting?.setting_value) {
        try {
          const parsed = JSON.parse(automationSetting.setting_value);
          if (parsed.enabled === false) {
            console.log(`Event reminder automation disabled for tenant ${tenantName}, skipping`);
            continue;
          }
        } catch { /* continue with default behavior */ }
      }

      // Check if email template is active
      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("subject, body_html, is_active")
        .eq("template_type", "event_reminder")
        .maybeSingle();

      if (template && !template.is_active) {
        console.log(`Event reminder template disabled, skipping tenant ${tenantName}`);
        continue;
      }

      // Get active members with emails for this tenant
      const { data: members, error: membersError } = await supabaseClient
        .from("members")
        .select("id, first_name, last_name, email, user_id")
        .eq("status", "active")
        .eq("tenant_id", tenantId)
        .not("email", "is", null);

      if (membersError) {
        console.error(`Error querying members for tenant ${tenantId}:`, membersError);
        continue;
      }

      if (!members || members.length === 0) {
        console.log(`No active members with email for tenant ${tenantName}`);
        continue;
      }

      // Batch-fetch language preferences
      const userIds = members.filter(m => m.user_id).map(m => m.user_id);
      let langMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id, language")
          .in("id", userIds);
        for (const p of profiles || []) {
          if (p.language) langMap[p.id] = p.language;
        }
      }

      // Build event list summary for the email
      for (const member of members) {
        if (!member.email) continue;

        const lang = detectLang(member.user_id ? langMap[member.user_id] : null);
        const t = eventReminderTranslations[lang];
        const serviceDate = formatServiceDate(tomorrow, lang);
        const memberName = `${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}`;

        // Build event names list
        const eventNames = tenantEvents.map(e => escapeHtml(e.name)).join(", ");

        const emailSubject = t.subject(eventNames);
        const emailBody = t.body(memberName, eventNames, serviceDate, escapeHtml(tenantName));

        try {
          await resend.emails.send({
            from: `${tenantName} <noreply@churchmanagementpro.com>`,
            to: [member.email],
            subject: emailSubject,
            html: emailBody,
          });
          totalSuccess++;
        } catch (emailError: any) {
          totalError++;
          console.error(`Failed to send reminder to ${member.email}:`, emailError);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Event reminders: ${totalSuccess} success, ${totalError} failed for ${Object.keys(eventsByTenant).length} tenants`);

    return new Response(
      JSON.stringify({ message: `Sent ${totalSuccess} event reminders`, successCount: totalSuccess, errorCount: totalError }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-event-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
