import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

serve(async (req: Request) => {
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

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { tenantId, description, amount, expenseDate, creatorName } = await req.json();

    if (!tenantId || !description || !amount) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role to fetch admin emails
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all approved admins for this tenant
    const { data: adminRoles } = await supabaseAdmin
      .from("tenant_user_roles")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("role", "admin")
      .eq("is_approved", true);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found for tenant", tenantId);
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin emails from profiles
    const adminUserIds = adminRoles.map((r) => r.user_id);
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .in("id", adminUserIds);

    const adminEmails = (adminProfiles || [])
      .map((p) => p.email)
      .filter((e): e is string => !!e);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(JSON.stringify({ message: "No admin emails" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get tenant name for branding
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const churchName = tenant?.name || "Église";
    const safeDescription = escapeHtml(description);
    const safeCreatorName = escapeHtml(creatorName || "Un membre");
    const formattedAmount = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
    const formattedDate = expenseDate || new Date().toISOString().split("T")[0];

    console.log(`Sending pending expense notification to ${adminEmails.length} admin(s)`);

    const emailResponse = await resend.emails.send({
      from: `${churchName} <noreply@churchmanagementpro.com>`,
      to: adminEmails,
      subject: `Nouvelle dépense en attente d'approbation: ${safeDescription.substring(0, 50)}`,
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
                <div style="width: 60px; height: 60px; background-color: #f59e0b20; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">⏳</span>
                </div>
              </div>
              
              <h1 style="color: #18181b; font-size: 24px; font-weight: 600; text-align: center; margin: 0 0 8px 0;">
                Nouvelle dépense en attente
              </h1>
              
              <p style="color: #71717a; font-size: 16px; text-align: center; margin: 0 0 32px 0;">
                Une dépense nécessite votre approbation.
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Créée par:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeCreatorName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Description:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${safeDescription}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Montant:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 600; text-align: right;">${formattedAmount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #71717a; font-size: 14px;">Statut:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <span style="background-color: #f59e0b20; color: #f59e0b; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
                        En attente
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0;">
                Connectez-vous à votre tableau de bord pour approuver ou rejeter cette dépense.
              </p>
            </div>
            
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 24px;">
              Cet email a été envoyé automatiquement par ${escapeHtml(churchName)}.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to send notification" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
