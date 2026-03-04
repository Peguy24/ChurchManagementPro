import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const WelcomeEmailSchema = z.object({
  memberId: z.string().uuid({ message: "Invalid member ID format" }),
  firstName: z.string().min(1).max(100).regex(/^[\p{L}\s'-]+$/u, { message: "Invalid characters in first name" }),
  lastName: z.string().min(1).max(100).regex(/^[\p{L}\s'-]+$/u, { message: "Invalid characters in last name" }),
  email: z.string().email({ message: "Invalid email format" }).max(255),
});

// Sanitize text for HTML to prevent XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Verify JWT and check user roles
async function verifyAuth(req: Request): Promise<{ valid: boolean; error?: string }> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  
  // Use ANON key to verify the user token
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Use SERVICE_ROLE_KEY to check user roles (bypasses RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Check user roles using admin client to bypass RLS
  const { data: roles, error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return { valid: false, error: "Failed to verify permissions" };
  }

  const allowedRoles = ["admin", "pastor", "secretary"];
  if (!roles?.some((r) => allowedRoles.includes(r.role))) {
    return { valid: false, error: "Insufficient permissions" };
  }

  return { valid: true };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyAuth(req);
    if (!authResult.valid) {
      console.error("Auth failed:", authResult.error);
      return new Response(
        JSON.stringify({ error: authResult.error }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse and validate input
    const rawBody = await req.json();
    const validationResult = WelcomeEmailSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: validationResult.error.errors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { memberId, firstName, lastName, email } = validationResult.data;
    
    // Sanitize for HTML output
    const safeFirstName = escapeHtml(firstName);
    const safeLastName = escapeHtml(lastName);

    console.log(`Sending welcome email to ${safeFirstName} ${safeLastName} (${email})`);

    const emailResponse = await resend.emails.send({
      from: "Church Manager Pro <noreply@churchmanagementpro.com>",
      to: [email],
      subject: `Byenveni ${safeFirstName} nan fanmi nou an! 🙏`,
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
              <p class="welcome-text">Chè ${safeFirstName} ${safeLastName},</p>
              
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
      JSON.stringify({ error: "Failed to send email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
