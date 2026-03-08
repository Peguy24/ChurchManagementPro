import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  eventName: z.string().min(1).max(255),
  eventDate: z.string().min(1),
  eventTime: z.string().nullable().optional(),
  eventLocation: z.string().nullable().optional(),
  churchName: z.string().optional(),
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const result = InputSchema.safeParse(rawBody);

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: result.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { firstName, lastName, email, eventName, eventDate, eventTime, eventLocation, churchName } = result.data;
    const safe = {
      firstName: escapeHtml(firstName),
      lastName: escapeHtml(lastName),
      eventName: escapeHtml(eventName),
      eventDate: escapeHtml(eventDate),
      eventTime: eventTime ? escapeHtml(eventTime) : null,
      eventLocation: eventLocation ? escapeHtml(eventLocation) : null,
      churchName: churchName ? escapeHtml(churchName) : "",
    };

    const senderName = safe.churchName || "Church Management Pro";

    const emailResponse = await resend.emails.send({
      from: `${senderName} <noreply@churchmanagementpro.com>`,
      to: [email],
      subject: `Confirmation d'inscription – ${safe.eventName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">✅ Inscription Confirmée!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="font-size: 18px; color: #667eea; font-weight: bold;">Bonjour ${safe.firstName} ${safe.lastName},</p>
              
              <p>Votre inscription à l'événement suivant a bien été enregistrée :</p>
              
              <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #333;">📅 ${safe.eventName}</p>
                <p style="margin: 4px 0; color: #555;">📆 Date : ${safe.eventDate}</p>
                ${safe.eventTime ? `<p style="margin: 4px 0; color: #555;">🕐 Heure : ${safe.eventTime}</p>` : ""}
                ${safe.eventLocation ? `<p style="margin: 4px 0; color: #555;">📍 Lieu : ${safe.eventLocation}</p>` : ""}
              </div>
              
              <p>Nous avons hâte de vous y voir ! N'hésitez pas à partager cet événement avec vos proches.</p>
              
              <p style="margin-top: 30px;">
                Cordialement,<br>
                <strong style="color: #667eea;">${senderName}</strong>
              </p>
            </div>
            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; font-size: 13px; color: #888;">
              Ce message a été envoyé automatiquement suite à votre inscription.
            </div>
          </body>
        </html>
      `,
    });

    console.log("Event registration email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending event registration email:", error);
    return new Response(JSON.stringify({ error: "Failed to send email" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
