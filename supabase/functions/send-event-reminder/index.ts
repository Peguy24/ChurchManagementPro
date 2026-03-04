import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
  
  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    console.log("Starting event reminder check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active tenants
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

    const serviceType = isSundayTomorrow ? "Dimanche" : "Mercredi";
    const serviceDate = tomorrow.toLocaleDateString("fr-FR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .eq("tenant_id", tenant.id)
        .not("email", "is", null);

      if (membersError) {
        console.error(`Error querying members for tenant ${tenant.id}:`, membersError);
        continue;
      }

      for (const member of members || []) {
        if (!member.email) continue;

        const memberName = `${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}`;
        const variables = { member_name: memberName, service_type: serviceType, service_date: serviceDate };

        const emailSubject = template?.subject 
          ? replaceTemplateVariables(template.subject, variables)
          : `📅 Rappel: Culte du ${serviceType} demain`;
        
        const emailBody = template?.body_html 
          ? replaceTemplateVariables(template.body_html, variables)
          : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">📅 Rappel de Service</h1>
              <p style="font-size: 18px;">Bonjour ${memberName},</p>
              <p>Nous vous rappelons notre culte de <strong>${serviceType}</strong> prévu le <strong>${serviceDate}</strong>.</p>
              <p>Nous espérons vous voir!</p>
              <p>${escapeHtml(tenant.name)}</p>
            </div>`;

        try {
          await resend.emails.send({
            from: `${tenant.name} <onboarding@resend.dev>`,
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
      JSON.stringify({ message: `Sent ${totalSuccess} event reminders`, successCount: totalSuccess, errorCount: totalError, serviceType, serviceDate }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-event-reminder function:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
