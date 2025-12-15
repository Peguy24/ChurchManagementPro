import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const ExpenseNotificationSchema = z.object({
  expenseId: z.string().uuid({ message: "Invalid expense ID format" }),
  description: z.string().min(1).max(500),
  amount: z.number().positive().max(999999999),
  status: z.enum(["approved", "rejected"]),
  creatorEmail: z.string().email({ message: "Invalid email format" }).max(255),
  creatorName: z.string().min(1).max(200).regex(/^[\p{L}\s'-]+$/u, { message: "Invalid characters in creator name" }),
  approverName: z.string().min(1).max(200).regex(/^[\p{L}\s'-]+$/u, { message: "Invalid characters in approver name" }),
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
  
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return { valid: false, error: "Invalid or expired token" };
  }

  // Check user roles
  const { data: roles } = await supabaseClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const allowedRoles = ["admin", "treasurer"];
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
    const validationResult = ExpenseNotificationSchema.safeParse(rawBody);
    
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

    const { 
      expenseId,
      description, 
      amount, 
      status, 
      creatorEmail, 
      creatorName,
      approverName 
    } = validationResult.data;

    // Sanitize for HTML output
    const safeDescription = escapeHtml(description);
    const safeCreatorName = escapeHtml(creatorName);
    const safeApproverName = escapeHtml(approverName);

    console.log("Sending expense notification:", { expenseId, status, creatorEmail });

    const statusText = status === "approved" ? "approuvée" : "rejetée";
    const statusColor = status === "approved" ? "#22c55e" : "#ef4444";
    const formattedAmount = new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD",
      minimumFractionDigits: 0 
    }).format(amount);

    const emailResponse = await resend.emails.send({
      from: "Gestion Église <onboarding@resend.dev>",
      to: [creatorEmail],
      subject: `Dépense ${statusText}: ${safeDescription.substring(0, 50)}${safeDescription.length > 50 ? '...' : ''}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="width: 60px; height: 60px; background-color: ${statusColor}20; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">${status === "approved" ? "✓" : "✗"}</span>
                </div>
              </div>
              
              <h1 style="color: #18181b; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 8px 0;">
                Dépense ${statusText}
              </h1>
              
              <p style="color: #71717a; font-size: 16px; text-align: center; margin: 0 0 32px 0;">
                Bonjour ${safeCreatorName},
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Description:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeDescription}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Montant:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Statut:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background-color: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                        ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">${status === "approved" ? "Approuvé" : "Rejeté"} par:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeApproverName}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0;">
                ${status === "approved" 
                  ? "Votre demande de dépense a été approuvée et sera traitée prochainement." 
                  : "Votre demande de dépense a été rejetée. Veuillez contacter l'administration pour plus d'informations."}
              </p>
            </div>
            
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
              Cet email a été envoyé automatiquement par le système de gestion de l'église.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-expense-notification function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
