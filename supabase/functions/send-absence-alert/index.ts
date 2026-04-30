import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { detectLang, absenceAlertTranslations, formatDateLocalized, getTenantDefaultLang } from "../_shared/email-translations.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const AlertEmailSchema = z.object({
  member_id: z.string().uuid({ message: "Invalid member ID format" }),
  member_name: z.string().min(1).max(200).regex(/^[\p{L}\s'-]+$/u, { message: "Invalid characters in member name" }),
  decline_percentage: z.number().min(0).max(100),
  last_attendance: z.string().nullable(),
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
    const validationResult = AlertEmailSchema.safeParse(rawBody);
    
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

    const { member_id, member_name, decline_percentage, last_attendance } = validationResult.data;
    
    // Sanitize for HTML output
    const safeMemberName = escapeHtml(member_name);

    console.log(`Sending absence alert for member: ${safeMemberName} (${member_id})`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get member email and user_id
    const { data: member, error: memberError } = await supabaseClient
      .from("members")
      .select("email, user_id")
      .eq("id", member_id)
      .single();

    if (memberError || !member?.email) {
      console.error("Member not found or no email:", memberError);
      return new Response(
        JSON.stringify({ error: "Membre sans adresse email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Detect member language
    let lang = detectLang(null);
    if (member.user_id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("language")
        .eq("id", member.user_id)
        .maybeSingle();
      lang = detectLang(profile?.language);
    }

    const t = absenceAlertTranslations[lang];
    const lastAttendanceText = formatDateLocalized(last_attendance, lang);

    const emailResponse = await resend.emails.send({
      from: "Église <noreply@churchmanagementpro.com>",
      to: [member.email],
      subject: t.subject,
      html: t.body(safeMemberName, decline_percentage.toFixed(0), escapeHtml(lastAttendanceText)),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-absence-alert function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send alert" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
