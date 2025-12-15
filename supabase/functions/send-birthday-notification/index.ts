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
    console.log("Starting birthday notification check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get today's date components for birthday matching
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    console.log(`Checking birthdays for ${month}/${day}`);

    // Query members with birthdays today
    // Use extract to match month and day from date_of_birth
    const { data: birthdayMembers, error: queryError } = await supabaseClient
      .from("members")
      .select("id, first_name, last_name, email, date_of_birth")
      .eq("status", "active")
      .not("email", "is", null)
      .not("date_of_birth", "is", null);

    if (queryError) {
      console.error("Error querying members:", queryError);
      throw queryError;
    }

    // Filter members with birthday today
    const todaysBirthdays = birthdayMembers?.filter((member) => {
      if (!member.date_of_birth) return false;
      const dob = new Date(member.date_of_birth);
      return dob.getMonth() + 1 === month && dob.getDate() === day;
    }) || [];

    console.log(`Found ${todaysBirthdays.length} members with birthdays today`);

    const results: any[] = [];

    for (const member of todaysBirthdays) {
      if (!member.email) continue;

      const safeFirstName = escapeHtml(member.first_name);
      const safeLastName = escapeHtml(member.last_name);

      // Calculate age
      const dob = new Date(member.date_of_birth);
      const age = today.getFullYear() - dob.getFullYear();

      try {
        const emailResponse = await resend.emails.send({
          from: "Église <onboarding@resend.dev>",
          to: [member.email],
          subject: "🎂 Joyeux Anniversaire!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">🎉 Joyeux Anniversaire ${safeFirstName}! 🎉</h1>
              <p style="font-size: 18px;">Cher(e) ${safeFirstName} ${safeLastName},</p>
              <p>En ce jour spécial, toute la communauté de l'église vous souhaite un très joyeux ${age}ème anniversaire!</p>
              <p>Que cette nouvelle année de vie soit remplie de:</p>
              <ul>
                <li>🙏 Bénédictions divines</li>
                <li>❤️ Amour et joie</li>
                <li>✨ Succès et accomplissements</li>
                <li>🌟 Santé et bonheur</li>
              </ul>
              <p style="font-size: 16px; font-style: italic;">"L'Éternel te bénira et te gardera." - Nombres 6:24</p>
              <p>Avec tout notre amour,<br><strong>L'équipe de l'église</strong></p>
            </div>
          `,
        });

        console.log(`Birthday email sent to ${member.email}:`, emailResponse);
        results.push({ member_id: member.id, success: true, email: member.email });
      } catch (emailError: any) {
        console.error(`Failed to send birthday email to ${member.email}:`, emailError);
        results.push({ member_id: member.id, success: false, error: emailError.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${todaysBirthdays.length} birthday notifications`,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-birthday-notification function:", error);
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
