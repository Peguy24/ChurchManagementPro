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

    // Get tomorrow's date for upcoming events
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Also check for events in 3 days for early reminder
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysStr = threeDaysLater.toISOString().split("T")[0];

    console.log(`Checking events for ${tomorrowStr} and ${threeDaysStr}`);

    // Get upcoming attendance events (services, meetings, etc.)
    const { data: upcomingEvents, error: eventsError } = await supabaseClient
      .from("attendance_records")
      .select("event_date, event_type")
      .or(`event_date.eq.${tomorrowStr},event_date.eq.${threeDaysStr}`)
      .limit(1);

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
    const isWednesdayTomorrow = dayOfWeek === 3; // Assuming Wednesday service

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

    const eventType = isSundayTomorrow ? "Culte du Dimanche" : "Service du Mercredi";
    const eventTime = isSundayTomorrow ? "9h00" : "18h30";
    const eventDate = tomorrow.toLocaleDateString("fr-FR", { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    console.log(`Sending reminders for ${eventType} on ${eventDate}`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const member of members || []) {
      if (!member.email) continue;

      const safeFirstName = escapeHtml(member.first_name);

      try {
        const emailResponse = await resend.emails.send({
          from: "Église <onboarding@resend.dev>",
          to: [member.email],
          subject: `📅 Rappel: ${eventType} demain`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">📅 Rappel de Service</h1>
              <p style="font-size: 18px;">Bonjour ${safeFirstName},</p>
              <p>Nous vous rappelons le service de demain:</p>
              <div style="background: #F3F4F6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>📍 Événement:</strong> ${eventType}</p>
                <p style="margin: 5px 0;"><strong>📆 Date:</strong> ${eventDate}</p>
                <p style="margin: 5px 0;"><strong>🕐 Heure:</strong> ${eventTime}</p>
              </div>
              <p>Nous avons hâte de vous voir!</p>
              <p style="font-size: 14px; color: #6B7280; font-style: italic;">
                "Là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux." - Matthieu 18:20
              </p>
              <p>À bientôt,<br><strong>L'équipe de l'église</strong></p>
            </div>
          `,
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
        message: `Sent ${successCount} event reminders for ${eventType}`,
        successCount,
        errorCount,
        eventType,
        eventDate
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
