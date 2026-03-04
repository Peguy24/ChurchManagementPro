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
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

interface AttendanceAlert {
  memberId: string;
  memberName: string;
  email: string;
  currentMonthRate: number;
  previousMonthRate: number;
  declinePercentage: number;
  lastAttendance: string | null;
  tenantName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (!expectedSecret) {
    return new Response(JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  try {
    console.log("Starting automatic attendance alert check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabaseClient
      .from("tenants")
      .select("id, name")
      .eq("is_active", true);

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError);
      throw tenantsError;
    }

    const { data: template } = await supabaseClient
      .from("email_templates")
      .select("subject, body_html, is_active")
      .eq("template_type", "attendance_alert")
      .maybeSingle();

    if (template && !template.is_active) {
      console.log("Attendance alert email template is disabled");
      return new Response(JSON.stringify({ message: "Attendance alerts are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const expectedServicesPerMonth = 8;

    let totalSuccess = 0;
    let totalError = 0;
    const allAlerts: any[] = [];

    for (const tenant of tenants || []) {
      console.log(`Processing attendance alerts for tenant: ${tenant.name}`);

      const { data: members } = await supabaseClient
        .from("members")
        .select("id, first_name, last_name, email")
        .eq("status", "active")
        .eq("tenant_id", tenant.id)
        .not("email", "is", null);

      const { data: attendanceRecords } = await supabaseClient
        .from("attendance_records")
        .select("member_id, event_date")
        .eq("tenant_id", tenant.id)
        .gte("event_date", previousMonthStart.toISOString().split("T")[0])
        .lte("event_date", today.toISOString().split("T")[0]);

      const alerts: AttendanceAlert[] = [];

      for (const member of members || []) {
        const memberAttendance = attendanceRecords?.filter(r => r.member_id === member.id) || [];

        const currentMonthAttendance = memberAttendance.filter(r => new Date(r.event_date) >= currentMonthStart).length;
        const previousMonthAttendance = memberAttendance.filter(r => {
          const d = new Date(r.event_date);
          return d >= previousMonthStart && d <= previousMonthEnd;
        }).length;

        const currentMonthRate = (currentMonthAttendance / expectedServicesPerMonth) * 100;
        const previousMonthRate = (previousMonthAttendance / expectedServicesPerMonth) * 100;
        const declinePercentage = previousMonthRate > 0 
          ? ((previousMonthRate - currentMonthRate) / previousMonthRate) * 100 : 0;

        const hasSignificantDecline = declinePercentage > 30 || 
          (previousMonthAttendance > 0 && currentMonthAttendance === 0);

        if (hasSignificantDecline && member.email) {
          const sorted = memberAttendance.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
          alerts.push({
            memberId: member.id,
            memberName: `${member.first_name} ${member.last_name}`,
            email: member.email,
            currentMonthRate, previousMonthRate, declinePercentage,
            lastAttendance: sorted[0]?.event_date || null,
            tenantName: tenant.name,
          });
        }
      }

      for (const alert of alerts) {
        const safeName = escapeHtml(alert.memberName);
        const variables = { member_name: safeName, attendance_rate: `${alert.currentMonthRate.toFixed(0)}%` };

        const emailSubject = template?.subject 
          ? replaceTemplateVariables(template.subject, variables) : "💙 Nous pensons à vous";
        const emailBody = template?.body_html 
          ? replaceTemplateVariables(template.body_html, variables)
          : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #4F46E5;">💙 Nous pensons à vous</h1>
              <p>Bonjour ${safeName},</p>
              <p>Nous avons remarqué que nous ne vous avons pas vu récemment et nous voulions vous faire savoir que vous nous manquez.</p>
              <p>Avec amour,<br><strong>${escapeHtml(tenant.name)}</strong></p>
            </div>`;

        try {
          await resend.emails.send({
            from: `${tenant.name} <noreply@churchmanagementpro.com>`,
            to: [alert.email],
            subject: emailSubject,
            html: emailBody,
          });
          totalSuccess++;
          allAlerts.push({ tenant: tenant.name, name: alert.memberName, decline: alert.declinePercentage.toFixed(0) + '%' });
        } catch (emailError: any) {
          totalError++;
          console.error(`Failed to send alert to ${alert.email}:`, emailError);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Attendance alerts: ${totalSuccess} success, ${totalError} failed`);

    return new Response(
      JSON.stringify({ message: `Processed attendance alerts across ${tenants?.length || 0} tenants`, successCount: totalSuccess, errorCount: totalError, alerts: allAlerts }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-attendance-alerts function:", error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
};

serve(handler);
