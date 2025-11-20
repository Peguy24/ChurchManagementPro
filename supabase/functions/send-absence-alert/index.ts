import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  member_id: string;
  member_name: string;
  decline_percentage: number;
  last_attendance: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { member_id, member_name, decline_percentage, last_attendance }: AlertEmailRequest = await req.json();

    console.log(`Sending absence alert for member: ${member_name} (${member_id})`);

    // Create Supabase client to get member email
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get member email
    const { data: member, error: memberError } = await supabaseClient
      .from('members')
      .select('email')
      .eq('id', member_id)
      .single();

    if (memberError || !member?.email) {
      console.error("Member not found or no email:", memberError);
      return new Response(
        JSON.stringify({ error: "Membre sans adresse email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const lastAttendanceText = last_attendance 
      ? new Date(last_attendance).toLocaleDateString('fr-FR')
      : "aucune présence récente";

    const emailResponse = await resend.emails.send({
      from: "Église <onboarding@resend.dev>",
      to: [member.email],
      subject: "Nous remarquons votre absence",
      html: `
        <h1>Bonjour ${member_name},</h1>
        <p>Nous avons remarqué que votre présence à l'église a diminué récemment.</p>
        <p><strong>Statistiques:</strong></p>
        <ul>
          <li>Baisse de présence: ${decline_percentage.toFixed(0)}%</li>
          <li>Dernière présence: ${lastAttendanceText}</li>
        </ul>
        <p>Nous nous soucions de vous et aimerions savoir si tout va bien. N'hésitez pas à nous contacter si vous avez besoin de quoi que ce soit.</p>
        <p>Que Dieu vous bénisse,<br>L'équipe de l'église</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-absence-alert function:", error);
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
