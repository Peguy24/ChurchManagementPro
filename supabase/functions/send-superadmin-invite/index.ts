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
  platformRole?: string; // New: support for granular platform roles
}

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrateur",
  finance_admin: "Admin Finance",
  moderator: "Modérateur",
  support: "Support Technique",
  sales: "Commercial / Ventes",
};

const PLATFORM_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "Accès complet à toutes les fonctionnalités",
    "Gestion de tous les tenants",
    "Administration des autres Super Admins",
    "Configuration globale de la plateforme",
  ],
  finance_admin: [
    "Consulter les données financières globales",
    "Voir les revenus et statistiques",
    "Accéder aux rapports de facturation",
  ],
  moderator: [
    "Modérer le contenu des tenants",
    "Gérer les signalements",
    "Suspendre des comptes si nécessaire",
  ],
  support: [
    "Accéder aux tenants pour le support",
    "Consulter les données utilisateurs",
    "Résoudre les problèmes techniques",
  ],
  sales: [
    "Gérer les prospects",
    "Effectuer des démonstrations",
    "Créer des essais gratuits",
  ],
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT authentication - only existing super admins can invite new ones
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("Missing or invalid Authorization header");
    return new Response(
      JSON.stringify({ error: "Unauthorized - Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Create Supabase client with service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify the user's token and check if they have super admin privileges
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userData?.user) {
    console.error("Invalid token:", userError);
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const invitedBy = userData.user.id;

  // Check if user has super_admin platform role or legacy admin role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  const { data: platformRoleData } = await supabase
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "super_admin")
    .maybeSingle();

  if (!roleData && !platformRoleData) {
    console.error("User does not have super admin privileges:", userData.user.id);
    return new Response(
      JSON.stringify({ error: "Forbidden - Super Admin privileges required" }),
      { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const { email, skipEmail = false, platformRole = "super_admin" }: SuperAdminInviteRequest = await req.json();

    console.log(`Creating Platform invitation for ${email}, role: ${platformRole}, skipEmail: ${skipEmail}`);

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

    // Always use the production domain for generated links
    const siteUrl = "https://churchmanagementpro.com";
    const registrationLink = `${siteUrl}/auth?superadmin_invite=${token}&role=${platformRole}`;

    // If skipEmail is true, return the link without sending email
    if (skipEmail) {
      console.log("Skipping email, returning invitation link directly");
      return new Response(JSON.stringify({ 
        success: true, 
        invitationLink: registrationLink,
        token: token,
        platformRole: platformRole,
        message: "Invitation created successfully (email skipped)"
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    const roleLabel = PLATFORM_ROLE_LABELS[platformRole] || "Administrateur";
    const rolePermissions = PLATFORM_ROLE_PERMISSIONS[platformRole] || [];
    const isSuperAdmin = platformRole === "super_admin";

    const emailResponse = await resend.emails.send({
      from: "Church Management <noreply@churchmanagementpro.com>",
      to: [email],
      subject: `Invitation ${roleLabel} - Plateforme Church Manager`,
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ Invitation ${roleLabel}</h1>
              <p style="color: #E9D5FF; margin: 10px 0 0 0; font-size: 16px;">Vous êtes invité à rejoindre l'équipe plateforme</p>
            </div>
            
            <div style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Vous avez été sélectionné pour le rôle de <strong>${roleLabel}</strong> sur la plateforme Church Manager Pro.
              </p>

              ${isSuperAdmin ? `
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #92400E; font-size: 14px; margin: 0;">
                  <strong>⚠️ Accès privilégié</strong><br>
                  Ce lien donne accès à toutes les fonctionnalités d'administration de la plateforme.
                </p>
              </div>
              ` : `
              <div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1E40AF; font-size: 14px; margin: 0;">
                  <strong>ℹ️ Accès restreint</strong><br>
                  Votre accès sera limité aux fonctionnalités de votre rôle.
                </p>
              </div>
              `}
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                En tant que ${roleLabel}, vous aurez accès à:
              </p>
              <ul style="color: #374151; font-size: 14px; line-height: 1.8; margin: 0 0 30px 0;">
                ${rolePermissions.map(p => `<li>${p}</li>`).join('')}
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationLink}" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #9333EA 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✨ Activer mon compte
                </a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Ce lien est valide pendant 7 jours. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
            </div>
            
            <div style="background-color: #F9FAFB; padding: 20px 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Church Manager Pro. Tous droits réservés.<br>
                <span style="color: #D1D5DB;">Invitation ${roleLabel} - Lien sécurisé à usage unique.</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Platform invite email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      data: emailResponse,
      invitationLink: registrationLink,
      platformRole: platformRole
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
