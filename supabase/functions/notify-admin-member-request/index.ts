import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const translations: Record<string, Record<string, string>> = {
  fr: {
    subject: "Nouvelle demande d'adhésion",
    heroTitle: "Nouvelle Demande 📋",
    body: "Une nouvelle personne souhaite rejoindre votre église.",
    name: "Nom",
    email: "Email",
    phone: "Téléphone",
    date: "Date de la demande",
    actionRequired: "Action requise",
    actionDesc: "Connectez-vous à l'application pour examiner et approuver cette demande.",
    cta: "Voir les demandes",
    footer: "Cet email a été envoyé automatiquement par",
    notProvided: "Non fourni",
  },
  en: {
    subject: "New membership request",
    heroTitle: "New Request 📋",
    body: "A new person wants to join your church.",
    name: "Name",
    email: "Email",
    phone: "Phone",
    date: "Request date",
    actionRequired: "Action required",
    actionDesc: "Log in to the application to review and approve this request.",
    cta: "View requests",
    footer: "This email was sent automatically by",
    notProvided: "Not provided",
  },
  ht: {
    subject: "Nouvo demann adhesyon",
    heroTitle: "Nouvo Demann 📋",
    body: "Yon nouvo moun vle rejwenn legliz ou a.",
    name: "Non",
    email: "Imèl",
    phone: "Telefòn",
    date: "Dat demann nan",
    actionRequired: "Aksyon obligatwa",
    actionDesc: "Konekte nan aplikasyon an pou revize epi apwouve demann sa a.",
    cta: "Wè demann yo",
    footer: "Imèl sa a te voye otomatikman pa",
    notProvided: "Pa bay",
  },
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, phone, tenantId, tenantName, language = "fr" } = await req.json();

    if (!tenantId || !firstName || !lastName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const t = translations[language] || translations["fr"];

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get tenant admin emails
    const { data: adminRoles } = await supabaseAdmin
      .from("tenant_user_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_approved", true);

    const adminEmails: string[] = [];
    for (const role of adminRoles || []) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(role.user_id);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found for tenant:", tenantId);
      return new Response(JSON.stringify({ success: false, message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ success: false, error: "Email not configured" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const churchName = tenantName || "Church Manager Pro";
    const siteUrl = "https://churchmanagementpro.com";
    const now = new Date().toLocaleDateString(language === "en" ? "en-US" : "fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⛪ ${churchName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">${t.heroTitle}</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px;">${t.body}</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>${t.name}:</strong> ${firstName} ${lastName}</p>
              <p style="margin: 0 0 10px 0;"><strong>${t.email}:</strong> ${email || t.notProvided}</p>
              <p style="margin: 0 0 10px 0;"><strong>${t.phone}:</strong> ${phone || t.notProvided}</p>
              <p style="margin: 0;"><strong>${t.date}:</strong> ${now}</p>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>⏳ ${t.actionRequired}:</strong> ${t.actionDesc}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${siteUrl}" style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${t.cta}</a>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              ${t.footer} ${churchName}.
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
        from: `${churchName} <noreply@churchmanagementpro.com>`,
        to: adminEmails,
        subject: `${t.subject} - ${firstName} ${lastName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Error sending member request notification:", result);
    } else {
      console.log("Member request notification sent:", result);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-member-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
