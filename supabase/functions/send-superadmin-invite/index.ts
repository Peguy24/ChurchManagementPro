import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SuperAdminInviteRequest {
  email: string;
  skipEmail?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, skipEmail = false }: SuperAdminInviteRequest = await req.json();

    console.log(`Creating Super Admin invitation for ${email}, skipEmail: ${skipEmail}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the inviting user from the authorization header
    const authHeader = req.headers.get("Authorization");
    let invitedBy: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      invitedBy = data?.user?.id || null;
    }

    // Check if invitation already exists for this email
    const { data: existingInvite } = await supabase
      .from("super_admin_invitations")
      .select("id, token")
      .eq("email", email)
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
        .from("super_admin_invitations")
        .insert({
          email: email,
          invited_by: invitedBy,
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
    const registrationLink = `${siteUrl}/auth?superadmin_invite=${token}`;

    // If skipEmail is true, return the link without sending email
    if (skipEmail) {
      console.log("Skipping email, returning invitation link directly");
      return new Response(JSON.stringify({ 
        success: true, 
        invitationLink: registrationLink,
        token: token,
        message: "Invitation created successfully (email skipped)"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "Church Management <onboarding@resend.dev>",
      to: [email],
      subject: "Invitation Super Administrateur - Plateforme Church Manager",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ Invitation Super Admin</h1>
              <p style="color: #E9D5FF; margin: 10px 0 0 0; font-size: 16px;">Vous êtes invité à administrer la plateforme</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vous avez été sélectionné pour devenir <strong>Super Administrateur</strong> de la plateforme Church Manager Pro.
              </p>

              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400E; font-size: 14px; margin: 0;">
                  <strong>⚠️ Accès privilégié</strong><br>
                  Ce lien donne accès à toutes les fonctionnalités d'administration de la plateforme.
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                En tant que Super Administrateur, vous aurez accès à:
              </p>
              <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0 0 30px 0;">
                <li>Gestion de tous les tenants (églises)</li>
                <li>Configuration globale de la plateforme</li>
                <li>Gestion des abonnements et facturation</li>
                <li>Administration des autres Super Admins</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✨ Activer mon compte Super Admin
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Ce lien est valide pendant 7 jours. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
            </div>
            
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Church Manager Pro. Tous droits réservés.<br>
                <span style="color: #D1D5DB;">Invitation Super Administrateur - Lien sécurisé à usage unique.</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Super Admin invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      data: emailResponse,
      invitationLink: registrationLink 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-superadmin-invite function:", error);
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
