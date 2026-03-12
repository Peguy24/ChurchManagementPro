import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const translations: Record<string, Record<string, string>> = {
  fr: {
    subject: "Bienvenue dans notre église!",
    heroTitle: "Bienvenue! 🎉",
    greeting: "Cher(e)",
    body: "Nous avons le plaisir de vous informer que votre demande d'adhésion a été approuvée!",
    whatToExpect: "Ce qui vous attend:",
    item1: "Des cultes réguliers où nous adorons ensemble",
    item2: "Des activités communautaires et événements spéciaux",
    item3: "Des ministères divers où vous pouvez participer",
    item4: "Du soutien et de la compagnie sur votre chemin spirituel",
    closing: "Si vous avez des questions, n'hésitez pas à nous contacter. Nous avons hâte de vous voir!",
    signoff: "Avec amour fraternel,",
    team: "L'équipe de",
    footer: "Ce message a été envoyé automatiquement par",
  },
  en: {
    subject: "Welcome to our church!",
    heroTitle: "Welcome! 🎉",
    greeting: "Dear",
    body: "We are pleased to inform you that your membership request has been approved!",
    whatToExpect: "What to expect:",
    item1: "Regular worship services where we praise together",
    item2: "Community activities and special events",
    item3: "Various ministries where you can participate",
    item4: "Support and fellowship on your spiritual journey",
    closing: "If you have any questions, don't hesitate to contact us. We look forward to seeing you!",
    signoff: "With love,",
    team: "The team at",
    footer: "This message was sent automatically by",
  },
  ht: {
    subject: "Byenveni nan legliz nou an!",
    heroTitle: "Byenveni! 🎉",
    greeting: "Chè",
    body: "Nou kontan enfòme ou ke demann adhesyon ou a te apwouve!",
    whatToExpect: "Sa w ka atann:",
    item1: "Kilt regilyèman kote nou adore ansanm",
    item2: "Aktivite kominotè ak evènman espesyal",
    item3: "Ministè divès kote w ka patisipe",
    item4: "Sipò ak konpayon sou chemen espirityèl ou",
    closing: "Si w gen nenpòt kesyon, pa ezite kontakte nou. Nou ap tann pou wè w!",
    signoff: "Avèk lanmou fratènèl,",
    team: "Ekip",
    footer: "Mesaj sa a te voye otomatikman pa",
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

    const { firstName, lastName, email, tenantName, language = "fr" } = await req.json();

    if (!email || !firstName || !tenantName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const t = translations[language] || translations["fr"];

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
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⛪ ${tenantName}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 20px;">${t.heroTitle}</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; font-weight: bold; color: #6366f1;">${t.greeting} ${firstName} ${lastName},</p>
            <p style="font-size: 16px;">${t.body}</p>
            <p style="font-size: 16px; font-weight: bold;">${t.whatToExpect}</p>
            <ul style="margin-left: 20px; font-size: 15px;">
              <li>${t.item1}</li>
              <li>${t.item2}</li>
              <li>${t.item3}</li>
              <li>${t.item4}</li>
            </ul>
            <p style="font-size: 16px;">${t.closing}</p>
            <p style="margin-top: 30px;">
              ${t.signoff}<br>
              <strong style="color: #6366f1;">${t.team} ${tenantName}</strong>
            </p>
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
        to: [email],
        subject: `${t.subject} - ${tenantName}`,
        html: emailHtml,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error("Error sending member welcome email:", result);
      return new Response(JSON.stringify({ success: false, error: result.message }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Member welcome email sent:", result);
    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-member-approved:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
