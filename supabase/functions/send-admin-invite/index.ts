import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminInviteRequest {
  email: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tenantId, tenantName, tenantSlug }: AdminInviteRequest = await req.json();

    console.log(`Sending admin invite to ${email} for tenant ${tenantName} (${tenantId})`);

    // Get the app URL from the request origin or use a default
    const origin = req.headers.get("origin") || "https://lovable.dev";
    const registrationLink = `${origin}/auth?tenant=${tenantId}&role=admin`;

    const emailResponse = await resend.emails.send({
      from: "Church Management <onboarding@resend.dev>",
      to: [email],
      subject: `Invitation administrateur - ${tenantName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Bienvenue!</h1>
              <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Vous êtes invité à administrer une église</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vous avez été invité à devenir <strong>administrateur</strong> de l'église <strong>${tenantName}</strong> dans notre système de gestion.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                En tant qu'administrateur, vous aurez accès à toutes les fonctionnalités de gestion de votre église, y compris la gestion des membres, des finances, des événements et plus encore.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Créer mon compte administrateur
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                <strong>Identifiant de l'église:</strong> ${tenantSlug}
              </p>
            </div>
            
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Church Management System. Tous droits réservés.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Admin invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-invite function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
