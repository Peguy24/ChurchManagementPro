import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const translations: Record<string, Record<string, string>> = {
  fr: {
    subject: "Invitation à rejoindre",
    heroTitle: "Invitation à",
    greeting: "Bonjour,",
    inviteText: "vous invite à rejoindre",
    inviteTextNoName: "Vous êtes invité(e) à rejoindre",
    asRole: "en tant que",
    body: "Cliquez sur le bouton ci-dessous pour créer votre compte et accéder à l'espace de gestion de l'église.",
    cta: "Accepter l'invitation",
    ignore: "Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.",
    fallbackLink: "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:",
    footer: "Cet email a été envoyé par Church Manager Pro.",
    admin: "Administrateur",
    pastor: "Pasteur",
    treasurer: "Trésorier",
    secretary: "Secrétaire",
    volunteer: "Volontaire",
    user: "Utilisateur",
  },
  en: {
    subject: "Invitation to join",
    heroTitle: "Invitation to",
    greeting: "Hello,",
    inviteText: "invites you to join",
    inviteTextNoName: "You are invited to join",
    asRole: "as",
    body: "Click the button below to create your account and access the church management platform.",
    cta: "Accept the invitation",
    ignore: "If you were not expecting this invitation, you can safely ignore this email.",
    fallbackLink: "If the button doesn't work, copy this link into your browser:",
    footer: "This email was sent by Church Manager Pro.",
    admin: "Administrator",
    pastor: "Pastor",
    treasurer: "Treasurer",
    secretary: "Secretary",
    volunteer: "Volunteer",
    user: "User",
  },
  ht: {
    subject: "Envitasyon pou rejwenn",
    heroTitle: "Envitasyon pou",
    greeting: "Bonjou,",
    inviteText: "envite ou rejwenn",
    inviteTextNoName: "Ou envite pou rejwenn",
    asRole: "kòm",
    body: "Klike sou bouton ki anba a pou kreye kont ou epi aksede platfòm jesyon legliz la.",
    cta: "Aksepte envitasyon an",
    ignore: "Si ou pa t ap tann envitasyon sa a, ou ka inyore imèl sa a san danje.",
    fallbackLink: "Si bouton an pa mache, kopye lyen sa a nan navigatè ou:",
    footer: "Imèl sa a te voye pa Church Manager Pro.",
    admin: "Administratè",
    pastor: "Pastè",
    treasurer: "Trezorye",
    secretary: "Sekretè",
    volunteer: "Volontè",
    user: "Itilizatè",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, tenantId, tenantName, tenantSlug, role, inviterName, skipEmail, language = "en" } = await req.json();

    if (!email || !tenantId || !tenantName) {
      console.error("Missing required fields:", { email, tenantId, tenantName });
      return new Response(
        JSON.stringify({ error: "Email, tenantId and tenantName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const t = translations[language] || translations["en"];

    // Build the invitation URL
    const siteUrl = "https://churchmanagementpro.com";
    const slug = tenantSlug || tenantId;
    const inviteUrl = `${siteUrl}/t/${slug}/auth?invite_email=${encodeURIComponent(email)}&role=${role || "user"}`;

    console.log(`Generating invitation for ${email} to tenant ${tenantName} with role ${role}`);

    // If skipEmail is true, just return the link without sending email
    if (skipEmail) {
      console.log("Skipping email, returning invitation link");
      return new Response(
        JSON.stringify({
          success: true,
          invitationLink: inviteUrl,
          message: "Invitation link generated successfully",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured, returning link instead");
      return new Response(
        JSON.stringify({
          success: true,
          invitationLink: inviteUrl,
          message: "Email service not configured, invitation link generated instead",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const roleKey = role || "user";
    const displayRole = t[roleKey] || t["user"];

    const inviterLine = inviterName
      ? `<strong>${inviterName}</strong> ${t.inviteText}`
      : t.inviteTextNoName;

    console.log(`Sending invitation email to ${email} for tenant ${tenantName} with role ${role}`);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${t.heroTitle} ${tenantName}</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${t.greeting}
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${inviterLine} <strong>${tenantName}</strong> ${t.asRole} <strong>${displayRole}</strong>.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              ${t.body}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                ${t.cta}
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              ${t.ignore}
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              ${t.footer}<br>
              ${t.fallbackLink}<br>
              <a href="${inviteUrl}" style="color: #3B82F6;">${inviteUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${tenantName} <noreply@churchmanagementpro.com>`,
        to: [email],
        subject: `${t.subject} ${tenantName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Error sending email:", result);
      return new Response(
        JSON.stringify({
          success: true,
          invitationLink: inviteUrl,
          emailError: result.message || "Failed to send email",
          message: "Email failed, invitation link generated instead",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
