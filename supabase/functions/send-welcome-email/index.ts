import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { memberId, firstName, lastName, email }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${firstName} ${lastName} (${email})`);

    if (!email) {
      console.error("No email provided for member:", memberId);
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "Église <onboarding@resend.dev>",
      to: [email],
      subject: `Byenveni ${firstName} nan fanmi nou an! 🙏`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 40px 30px;
                border: 1px solid #e0e0e0;
                border-top: none;
              }
              .welcome-text {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #667eea;
              }
              .message {
                margin-bottom: 20px;
                font-size: 16px;
              }
              .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                border-radius: 0 0 10px 10px;
                font-size: 14px;
                color: #666;
              }
              .highlight {
                color: #667eea;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">🙏 Byenveni nan Fanmi Nou!</h1>
            </div>
            <div class="content">
              <p class="welcome-text">Chè ${firstName} ${lastName},</p>
              
              <p class="message">
                Nou kontan anpil pou resevwa ou kòm nouvo manm nan kominote nou an! 
                Ou vin fè pati yon fanmi ki baze sou lafwa, lanmou, ak sipò mitiyèl.
              </p>
              
              <p class="message">
                <strong>Sa w ka atann:</strong>
              </p>
              <ul style="margin-left: 20px;">
                <li>Kilt regilyèman kote nou adore ansanm</li>
                <li>Aktivite kominotè ak evènman espesyal</li>
                <li>Ministè divès kote w ka patisipe</li>
                <li>Sipò ak konpayon sou chemen espirityèl ou</li>
              </ul>
              
              <p class="message">
                Si w gen nenpòt kesyon oswa si w bezwen èd, pa ezite kontakte nou. 
                Nou la pou ede w nan chak etap.
              </p>
              
              <p class="message">
                N ap tann pou wè w nan pwochen reyinyon nou! 🌟
              </p>
              
              <p style="margin-top: 30px;">
                Avèk lanmou fratènèl,<br>
                <strong class="highlight">Ekip Legliz la</strong>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">
                Mesaj sa a te voye otomatikman paske w nouvo enskriri nan sistèm jesyon nou an.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
