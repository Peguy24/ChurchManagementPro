import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

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

    console.log(`Creating secure invitation for ${email} to become admin of ${tenantName} (${tenantId})`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if invitation already exists for this email and tenant
    const { data: existingInvite } = await supabase
      .from("admin_invitations")
      .select("id, token")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    let token: string;

    if (existingInvite) {
      // Reuse existing valid invitation
      token = existingInvite.token;
      console.log("Reusing existing invitation token");
    } else {
      // Create new invitation with secure token
      const { data: newInvite, error: insertError } = await supabase
        .from("admin_invitations")
        .insert({
          tenant_id: tenantId,
          email: email,
        })
        .select("token")
        .single();

      if (insertError) {
        console.error("Failed to create invitation:", insertError);
        throw new Error("Failed to create invitation: " + insertError.message);
      }

      token = newInvite.token;
      console.log("Created new invitation token");
    }

    // Get the app URL from environment or request origin
    const siteUrl = Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://lovable.dev";
    const registrationLink = `${siteUrl}/t/${tenantSlug}/auth?invite=${token}`;

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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔐 Invitation Sécurisée</h1>
              <p style="color: #E0E7FF; margin: 10px 0 0 0; font-size: 16px;">Vous êtes invité à administrer une église</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vous avez été personnellement sélectionné pour devenir <strong>administrateur</strong> de l'église <strong>${tenantName}</strong>.
              </p>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400E; font-size: 14px; margin: 0;">
                  <strong>⚠️ Lien personnel et sécurisé</strong><br>
                  Ce lien est unique et valide pour 7 jours. Ne le partagez avec personne.
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                En tant qu'administrateur, vous aurez accès à toutes les fonctionnalités de gestion de votre église, y compris la gestion des membres, des finances, des événements et plus encore.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✨ Activer mon compte administrateur
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Si vous n'avez pas demandé cette invitation ou ne reconnaissez pas cette église, vous pouvez ignorer cet email en toute sécurité.
              </p>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                <strong>Église:</strong> ${tenantName}<br>
                <strong>Identifiant:</strong> ${tenantSlug}
              </p>
            </div>
            
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Church Management System. Tous droits réservés.<br>
                <span style="color: #D1D5DB;">Cet email contient un lien sécurisé à usage unique.</span>
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
