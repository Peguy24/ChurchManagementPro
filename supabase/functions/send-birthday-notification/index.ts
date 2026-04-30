import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { detectLang, birthdayTranslations, getTenantDefaultLang, type EmailLang } from "../_shared/email-translations.ts";

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

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  const bearerToken = authHeader?.replace("Bearer ", "");
  const isAuthorized = bearerToken && (
    (expectedSecret && bearerToken === expectedSecret) ||
    (serviceRoleKey && bearerToken === serviceRoleKey)
  );
  
  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    const body = await req.json().catch(() => ({}));
    console.log("Starting birthday notification check...", body);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: tenants, error: tenantsError } = await supabaseClient
      .from("tenants")
      .select("id, name");

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    // Allow overriding the check date for manual triggers (format: YYYY-MM-DD)
    const checkDate = body.check_date ? new Date(body.check_date + "T12:00:00Z") : new Date();
    const today = checkDate;
    const month = today.getMonth() + 1;
    const day = today.getDate();
    console.log(`Checking birthdays for ${month}/${day}`);

    const allResults: any[] = [];

    for (const tenant of tenants || []) {
      console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);

      const { data: template } = await supabaseClient
        .from("email_templates")
        .select("subject, body_html, is_active")
        .eq("template_type", "birthday")
        .maybeSingle();

      if (template && !template.is_active) {
        console.log(`Birthday template disabled, skipping tenant ${tenant.name}`);
        continue;
      }

      const { data: birthdayMembers, error: queryError } = await supabaseClient
        .from("members")
        .select("id, first_name, last_name, email, date_of_birth, user_id")
        .eq("status", "active")
        .eq("tenant_id", tenant.id)
        .not("email", "is", null)
        .not("date_of_birth", "is", null);

      if (queryError) {
        console.error(`Error querying members for tenant ${tenant.id}:`, queryError);
        continue;
      }

      const todaysBirthdays = birthdayMembers?.filter((member) => {
        if (!member.date_of_birth) return false;
        const dob = new Date(member.date_of_birth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      }) || [];

      console.log(`Found ${todaysBirthdays.length} birthdays for tenant ${tenant.name}`);

      // Batch-fetch language preferences for members with user_id
      const userIds = todaysBirthdays.filter(m => m.user_id).map(m => m.user_id);
      let langMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("id, language")
          .in("id", userIds);
        for (const p of profiles || []) {
          if (p.language) langMap[p.id] = p.language;
        }
      }

      const tenantLang = await getTenantDefaultLang(supabaseClient, tenant.id);

      for (const member of todaysBirthdays) {
        if (!member.email) continue;

        const lang = detectLang(member.user_id ? langMap[member.user_id] : null, tenantLang);
        const safeFirstName = escapeHtml(member.first_name);
        const safeLastName = escapeHtml(member.last_name);
        const memberName = `${safeFirstName} ${safeLastName}`;
        const dob = new Date(member.date_of_birth);
        const age = today.getFullYear() - dob.getFullYear();

        const variables = { member_name: memberName, age: age.toString() };
        const t = birthdayTranslations[lang];

        // Always use localized translations so each member gets the email in their language
        const emailSubject = t.subject(memberName);
        const emailBody = t.body(memberName, age, escapeHtml(tenant.name));

        try {
          await resend.emails.send({
            from: `${tenant.name} <noreply@churchmanagementpro.com>`,
            to: [member.email],
            subject: emailSubject,
            html: emailBody,
          });
          allResults.push({ tenant: tenant.name, member_id: member.id, success: true });
        } catch (emailError: any) {
          console.error(`Failed to send birthday email to ${member.email}:`, emailError);
          allResults.push({ tenant: tenant.name, member_id: member.id, success: false, error: emailError.message });
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return new Response(
      JSON.stringify({ message: `Processed birthday notifications across ${tenants?.length || 0} tenants`, results: allResults }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-birthday-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
