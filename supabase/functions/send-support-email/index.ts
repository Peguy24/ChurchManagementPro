import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const userId = userData.user.id;
  const userEmail = userData.user.email || "";

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create_ticket") {
      const { subject, message, priority, category, tenantId } = body;

      // Validate inputs
      if (!subject || subject.length < 5 || subject.length > 200) {
        return new Response(JSON.stringify({ error: "Subject must be 5-200 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (!message || message.length < 20 || message.length > 2000) {
        return new Response(JSON.stringify({ error: "Message must be 20-2000 characters" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (!["low", "medium", "high"].includes(priority)) {
        return new Response(JSON.stringify({ error: "Invalid priority" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      if (!["general", "billing", "technical", "feature_request"].includes(category)) {
        return new Response(JSON.stringify({ error: "Invalid category" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // Insert ticket
      const { data: ticket, error: insertError } = await supabase
        .from("support_tickets")
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          subject,
          message,
          priority,
          category,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(insertError.message);
      }

      // Get tenant name
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();

      // Gather all super admin emails
      const superAdminEmails: string[] = ["support@churchmanager.pro"];
      try {
        // Get admins from user_roles (old system)
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        // Get super_admins from platform_user_roles
        const { data: platformRoles } = await supabase
          .from("platform_user_roles")
          .select("user_id")
          .eq("role", "super_admin");

        const allAdminUserIds = new Set<string>();
        adminRoles?.forEach((r) => allAdminUserIds.add(r.user_id));
        platformRoles?.forEach((r) => allAdminUserIds.add(r.user_id));

        for (const adminId of allAdminUserIds) {
          const { data: adminUser } = await supabase.auth.admin.getUserById(adminId);
          if (adminUser?.user?.email && !superAdminEmails.includes(adminUser.user.email)) {
            superAdminEmails.push(adminUser.user.email);
          }
        }
      } catch (fetchErr) {
        console.error("Failed to fetch super admin emails:", fetchErr);
      }

      // Send notification email to all super admins (best effort)
      try {
        await resend.emails.send({
          from: "Church Manager Pro <noreply@churchmanagementpro.com>",
          to: superAdminEmails,
          subject: `[Support] ${priority.toUpperCase()} - ${subject}`,
          html: `
            <h2>Nouveau ticket de support</h2>
            <p><strong>Église:</strong> ${tenant?.name || "N/A"}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Catégorie:</strong> ${category}</p>
            <p><strong>Priorité:</strong> ${priority}</p>
            <p><strong>Sujet:</strong> ${subject}</p>
            <hr>
            <p>${message.replace(/\n/g, "<br>")}</p>
          `,
        });
      } catch (emailErr) {
        console.error("Email notification failed (non-blocking):", emailErr);
      }

      return new Response(JSON.stringify({ success: true, ticket }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (action === "respond_ticket") {
      const { ticketId, response, newStatus } = body;

      // Check super admin
      const { data: superAdminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      const { data: platformSuperAdmin } = await supabase
        .from("platform_user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "super_admin")
        .maybeSingle();

      if (!superAdminRole && !platformSuperAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // Update ticket
      const updateData: Record<string, unknown> = {
        status: newStatus || "in_progress",
        responded_by: userId,
        responded_at: new Date().toISOString(),
      };
      if (response) {
        updateData.admin_response = response;
      }

      const { data: updatedTicket, error: updateError } = await supabase
        .from("support_tickets")
        .update(updateData)
        .eq("id", ticketId)
        .select("*, tenants(name)")
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(updateError.message);
      }

      // Send response email to requester
      if (response) {
        try {
          const { data: requester } = await supabase.auth.admin.getUserById(updatedTicket.user_id);
          if (requester?.user?.email) {
            await resend.emails.send({
              from: "Church Manager Pro <noreply@churchmanagementpro.com>",
              to: [requester.user.email],
              subject: `Réponse à votre ticket: ${updatedTicket.subject}`,
              html: `
                <h2>Réponse à votre demande de support</h2>
                <p><strong>Sujet:</strong> ${updatedTicket.subject}</p>
                <hr>
                <p>${response.replace(/\n/g, "<br>")}</p>
                <hr>
                <p style="color: #6B7280; font-size: 14px;">Connectez-vous à votre tableau de bord pour plus de détails.</p>
              `,
            });
          }
        } catch (emailErr) {
          console.error("Response email failed (non-blocking):", emailErr);
        }
      }

      return new Response(JSON.stringify({ success: true, ticket: updatedTicket }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
