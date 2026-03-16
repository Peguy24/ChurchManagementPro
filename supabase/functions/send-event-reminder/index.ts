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

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
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

    const { data: tenants, error: tenantsError } = await supabaseClient
      .from("tenants")
      .select("id, name")
      .eq("is_active", true);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();
    const isSundayTomorrow = dayOfWeek === 0;
    const isWednesdayTomorrow = dayOfWeek === 3;

    if (!isSundayTomorrow && !isWednesdayTomorrow) {
      console.log("No regular service tomorrow, skipping reminders");
      return new Response(JSON.stringify({ message: "No service reminders needed today" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const serviceTypeKey = isSundayTomorrow ? "Dimanche" : "Mercredi";

    let totalSuccess = 0;
    let totalError = 0;

    for (const tenant of tenants || []) {
      console.log(`Processing event reminders for tenant: ${tenant.name}`);

      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("subject, body_html, is_active")
        .eq("template_type", "event_reminder")
        .maybeSingle();

      if (template && !template.is_active) {
        console.log(`Event reminder template disabled, skipping tenant ${tenant.name}`);
        continue;
      }

      const { data: members, error: membersError } = await supabaseClient
        .from("members")
        .select("id, first_name, last_name, email, user_id")
        .eq("status", "active")
        .eq("tenant_id", tenant.id)
        .not("email", "is", null);

      if (membersError) {
        console.error(`Error querying members for tenant ${tenant.id}:`, membersError);
        continue;
      }

      // Batch-fetch language preferences
      const userIds = (members || []).filter(m => m.user_id).map(m => m.user_id);
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

      for (const member of members || []) {
        if (!member.email) continue;

        const lang = detectLang(member.user_id ? langMap[member.user_id] : null);
        const t = eventReminderTranslations[lang];
        const localizedServiceType = t.serviceTypes[serviceTypeKey] || serviceTypeKey;
        const serviceDate = formatServiceDate(tomorrow, lang);
        const memberName = `${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}`;
        const variables = { member_name: memberName, service_type: localizedServiceType, service_date: serviceDate };

        // Always use localized translations so each member gets the email in their language
        const emailSubject = t.subject(localizedServiceType);
        const emailBody = t.body(memberName, localizedServiceType, serviceDate, escapeHtml(tenant.name));

        try {
          await resend.emails.send({
            from: `${tenant.name} <noreply@churchmanagementpro.com>`,
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

    console.log(`Event reminders: ${totalSuccess} success, ${totalError} failed across ${tenants?.length || 0} tenants`);

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
