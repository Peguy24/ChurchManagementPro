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
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

  try {
    console.log("Starting event reminder check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get email template
    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("subject, body_html, is_active")
      .eq("template_type", "event_reminder")
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching template:", templateError);
    }

    // Check if template is active
    if (template && !template.is_active) {
      console.log("Event reminder email template is disabled");
      return new Response(
        JSON.stringify({ message: "Event reminders are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get tomorrow's date for upcoming events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all active members with email for notifications
    const { data: members, error: membersError } = await supabaseClient
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("status", "active")
      .not("email", "is", null);

    if (membersError) {
      console.error("Error querying members:", membersError);
      throw membersError;
    }

    // For demonstration, we'll send reminders about regular Sunday service
    const dayOfWeek = tomorrow.getDay();
    const isSundayTomorrow = dayOfWeek === 0;
    const isWednesdayTomorrow = dayOfWeek === 3;

    if (!isSundayTomorrow && !isWednesdayTomorrow) {
      console.log("No regular service tomorrow, skipping reminders");
      return new Response(
        JSON.stringify({ 
          message: "No service reminders needed today",
          nextServiceDay: dayOfWeek < 3 ? "Wednesday" : dayOfWeek < 7 ? "Sunday" : "Wednesday"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const serviceType = isSundayTomorrow ? "Dimanche" : "Mercredi";
    const serviceDate = tomorrow.toLocaleDateString("fr-FR", { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    console.log(`Sending reminders for Culte du ${serviceType} on ${serviceDate}`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const member of members || []) {
      if (!member.email) continue;

      const safeFirstName = escapeHtml(member.first_name);
      const safeLastName = escapeHtml(member.last_name);
      const memberName = `${safeFirstName} ${safeLastName}`;

      // Prepare template variables
      const variables = {
        member_name: memberName,
        service_type: serviceType,
        service_date: serviceDate,
      };

      // Use custom template or default
      const emailSubject = template?.subject 
        ? replaceTemplateVariables(template.subject, variables)
        : `📅 Rappel: Culte du ${serviceType} demain`;
      
      const emailBody = template?.body_html 
        ? replaceTemplateVariables(template.body_html, variables)
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">📅 Rappel de Service</h1>
            <p style="font-size: 18px;">Bonjour ${memberName},</p>
            <p>Nous vous rappelons notre culte de <strong>${serviceType}</strong> prévu le <strong>${serviceDate}</strong>.</p>
            <p>Nous espérons vous voir!</p>
            <p>Votre église</p>
          </div>
        `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Église <onboarding@resend.dev>",
          to: [member.email],
          subject: emailSubject,
          html: emailBody,
        });

        successCount++;
        results.push({ member_id: member.id, success: true });
      } catch (emailError: any) {
        errorCount++;
        console.error(`Failed to send reminder to ${member.email}:`, emailError);
        results.push({ member_id: member.id, success: false, error: emailError.message });
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Event reminders sent: ${successCount} success, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} event reminders for Culte du ${serviceType}`,
        successCount,
        errorCount,
        serviceType,
        serviceDate
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-event-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
