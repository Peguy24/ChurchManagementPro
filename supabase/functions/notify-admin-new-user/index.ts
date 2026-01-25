import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewUserNotificationRequest {
  userId: string;
  userEmail: string;
  firstName: string;
  lastName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Notify admin new user function called");

    // Parse request body
    const { userId, userEmail, firstName, lastName }: NewUserNotificationRequest = await req.json();

    console.log(`New user signup: ${firstName} ${lastName} (${userEmail})`);

    // Create Supabase client with service role to fetch admin emails
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all admin user IDs
    const { data: adminRoles, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin profiles to find their names
    const adminUserIds = adminRoles.map((r) => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", adminUserIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
    }

    // Get admin emails from auth.users using admin API
    const adminEmails: string[] = [];
    for (const adminId of adminUserIds) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(adminId);
      if (!userError && userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} admin(s)`);

    // Get church settings for church name
    const { data: churchSettings } = await supabaseAdmin
      .from("church_settings")
      .select("setting_value")
      .eq("setting_key", "church_name")
      .maybeSingle();

    const churchName = churchSettings?.setting_value || "Church Manager Pro";

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: `${churchName} <onboarding@resend.dev>`,
      to: adminEmails,
      subject: `🆕 Nouvel utilisateur en attente d'approbation - ${firstName} ${lastName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⛪ ${churchName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Notification d'inscription</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
            <h2 style="color: #1a1a2e; margin-top: 0;">Nouvel utilisateur inscrit</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Nom:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 0;"><strong>Date d'inscription:</strong> ${new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong>⏳ Action requise:</strong> Cet utilisateur attend votre approbation pour accéder au système.
              </p>
            </div>
            
            <p style="margin: 20px 0;">
              Connectez-vous à l'application pour approuver cet utilisateur et lui assigner un rôle approprié.
            </p>
            
            <p style="color: #6c757d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef;">
              Ce message a été envoyé automatiquement par ${churchName}.<br>
              Merci de ne pas y répondre directement.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent to admins" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
