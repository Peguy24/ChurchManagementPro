import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tenantId, tenantName, role, inviterName } = await req.json();

    if (!email || !tenantId || !tenantName) {
      console.error("Missing required fields:", { email, tenantId, tenantName });
      return new Response(
        JSON.stringify({ error: "Email, tenantId and tenantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the invitation URL
    const baseUrl = Deno.env.get("SITE_URL") || "https://preview--ihwhbtmnyhhceiwdcfsc.lovable.app";
    const inviteUrl = `${baseUrl}/auth?tenant=${tenantId}&role=${role || 'user'}`;

    const roleLabel: Record<string, string> = {
      admin: "Administrateur",
      pastor: "Pasteur",
      treasurer: "Trésorier",
      secretary: "Secrétaire",
      volunteer: "Volontaire",
      user: "Utilisateur",
    };

    const displayRole = roleLabel[role] || "Utilisateur";

    console.log(`Sending invitation to ${email} for tenant ${tenantName} with role ${role}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Invitation à ${tenantName}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Bonjour,
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${inviterName ? `<strong>${inviterName}</strong> vous invite` : "Vous êtes invité(e)"} à rejoindre <strong>${tenantName}</strong> en tant que <strong>${displayRole}</strong>.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à l'espace de gestion de l'église.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                Accepter l'invitation
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Cet email a été envoyé par ChurchFlow.<br>
              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br>
              <a href="${inviteUrl}" style="color: #6366f1;">${inviteUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ChurchFlow <onboarding@resend.dev>",
        to: [email],
        subject: `Invitation à rejoindre ${tenantName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error sending email:", result);
      return new Response(
        JSON.stringify({ error: result.message || "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
