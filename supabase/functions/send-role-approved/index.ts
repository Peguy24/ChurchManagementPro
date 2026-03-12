import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const translations: Record<string, Record<string, string>> = {
  fr: {
    subject: "Votre accès a été approuvé",
    heroTitle: "Accès Approuvé! ✅",
    greeting: "Bonjour",
    body: "Nous avons le plaisir de vous informer que votre demande d'accès a été approuvée.",
    roleAssigned: "Rôle attribué",
    canNow: "Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités associées à votre rôle.",
    cta: "Se connecter",
    footer: "Cet email a été envoyé automatiquement par",
    admin: "Administrateur",
    pastor: "Pasteur",
    treasurer: "Trésorier",
    secretary: "Secrétaire",
    volunteer: "Volontaire",
    user: "Utilisateur",
  },
  en: {
    subject: "Your access has been approved",
    heroTitle: "Access Approved! ✅",
    greeting: "Hello",
    body: "We are pleased to inform you that your access request has been approved.",
    roleAssigned: "Assigned role",
    canNow: "You can now log in and access all the features associated with your role.",
    cta: "Log In",
    footer: "This email was sent automatically by",
    admin: "Administrator",
    pastor: "Pastor",
    treasurer: "Treasurer",
    secretary: "Secretary",
    volunteer: "Volunteer",
    user: "User",
  },
  ht: {
    subject: "Aksè ou apwouve",
    heroTitle: "Aksè Apwouve! ✅",
    greeting: "Bonjou",
    body: "Nou kontan enfòme ou ke demann aksè ou a te apwouve.",
    roleAssigned: "Wòl atribye",
    canNow: "Ou ka konekte kounye a epi aksede tout fonksyonalite ki asosye ak wòl ou.",
    cta: "Konekte",
    footer: "Imèl sa a te voye otomatikman pa",
    admin: "Administratè",
    pastor: "Pastè",
    treasurer: "Trezorye",
    secretary: "Sekretè",
    volunteer: "Volontè",
    user: "Itilizatè",
  },
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { userEmail, firstName, lastName, role, tenantName, tenantSlug, language = "fr" } = await req.json();

    if (!userEmail || !tenantName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const t = translations[language] || translations["fr"];
    const displayRole = t[role] || t["user"];
    const safeName = `${firstName || ""} ${lastName || ""}`.trim();
    const siteUrl = "https://churchmanagementpro.com";
    const loginUrl = tenantSlug ? `${siteUrl}/t/${tenantSlug}/auth` : siteUrl;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⛪ ${tenantName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">${t.heroTitle}</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px;">${t.greeting} ${safeName},</p>
            <p style="font-size: 16px;">${t.body}</p>
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border: 1px solid #6ee7b7; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #065f46; font-size: 14px;"><strong>${t.roleAssigned}:</strong> ${displayRole}</p>
            </div>
            <p style="font-size: 16px;">${t.canNow}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${t.cta}</a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              ${t.footer} ${tenantName}.
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
        to: [userEmail],
        subject: `${t.subject} - ${tenantName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Error sending role approved email:", result);
      return new Response(JSON.stringify({ success: false, error: result.message }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Role approved email sent:", result);
    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-role-approved:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
