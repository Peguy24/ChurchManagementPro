import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminInviteRequest {
  email: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  skipEmail?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate JWT authentication
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

  // Verify the user's token
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !userData?.user) {
    console.error("Invalid token:", userError);
    return new Response(
      JSON.stringify({ error: "Unauthorized - Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const userId = userData.user.id;

  try {
    const { email, tenantId, tenantName, tenantSlug, skipEmail = false }: AdminInviteRequest = await req.json();

    console.log(`Checking permissions for user ${userId} to invite admin for tenant ${tenantId}`);

    // Check if user is a super admin (platform level)
    const { data: superAdminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const { data: platformSuperAdmin } = await supabase
      .from("platform_user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();

    const isSuperAdmin = !!superAdminRole || !!platformSuperAdmin;

    // Check if user is a tenant admin for the specific tenant
    const { data: tenantAdminRole } = await supabase
      .from("tenant_user_roles")
      .select("role, is_approved")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_approved", true)
      .maybeSingle();

    const isTenantAdmin = !!tenantAdminRole;

    // User must be either a super admin OR a tenant admin for this specific tenant
    if (!isSuperAdmin && !isTenantAdmin) {
      console.error(`User ${userId} does not have permission to invite admins for tenant ${tenantId}`);
      return new Response(
        JSON.stringify({ error: "Forbidden - You must be an admin of this church to send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`User ${userId} authorized (superAdmin: ${isSuperAdmin}, tenantAdmin: ${isTenantAdmin}). Creating invitation for ${email} to tenant ${tenantName}`);

    // Check if email is already registered as an approved user/admin for this tenant
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      const { data: existingRole } = await supabase
        .from("tenant_user_roles")
        .select("role, is_approved")
        .eq("user_id", existingUser.id)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (existingRole) {
        const statusLabel = existingRole.is_approved ? "approved" : "pending approval";
        console.log(`Email ${email} already has role '${existingRole.role}' (${statusLabel}) for tenant ${tenantId}`);
        return new Response(
          JSON.stringify({ 
            error: `This email is already registered as ${existingRole.role} for this church (${statusLabel}).`,
            alreadyExists: true,
            role: existingRole.role,
            isApproved: existingRole.is_approved,
          }),
          { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Check if invitation already exists for this email and tenant
    const { data: existingInvite } = await supabase
      .from("admin_invitations")
      .select("id, token")
      .eq("email", email)
      .eq("tenant_id", tenantId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    let inviteToken: string;

    if (existingInvite) {
      // Reuse existing valid invitation
      inviteToken = existingInvite.token;
      console.log("Reusing existing invitation token");
    } else {
      // Create new invitation with secure token
      const { data: newInvite, error: insertError } = await supabase
        .from("admin_invitations")
        .insert({
          tenant_id: tenantId,
          email: email,
          created_by: userId,
        })
        .select("token")
        .single();

      if (insertError) {
        console.error("Failed to create invitation:", insertError);
        throw new Error("Failed to create invitation: " + insertError.message);
      }

      inviteToken = newInvite.token;
      console.log("Created new invitation token");
    }

    // Always use the production domain for generated links
    const siteUrl = "https://churchmanagementpro.com";
    const registrationLink = `${siteUrl}/t/${tenantSlug}/auth?invite=${inviteToken}`;

    // If skipEmail is true, return the link without sending email
    if (skipEmail) {
      console.log("Skipping email, returning invitation link directly");
      return new Response(JSON.stringify({ 
        success: true, 
        invitationLink: registrationLink,
        token: inviteToken,
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
      from: "Church Management <noreply@churchmanagementpro.com>",
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
                © ${new Date().getFullYear()} Church Manager Pro. Tous droits réservés.<br>
                <span style="color: #D1D5DB;">Cet email contient un lien sécurisé à usage unique.</span>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend returned an error:", emailResponse.error);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.error.message }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Admin invite email sent successfully:", emailResponse);

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
