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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate CRON_SECRET for scheduled function security
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (!expectedSecret) {
    console.error("CRON_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    console.error("Unauthorized access attempt to check-attendance-alerts");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    console.log("Starting automatic attendance alert check...");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get email template
    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("subject, body_html, is_active")
      .eq("template_type", "attendance_alert")
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching template:", templateError);
    }

    // Check if template is active
    if (template && !template.is_active) {
      console.log("Attendance alert email template is disabled");
      return new Response(
        JSON.stringify({ message: "Attendance alerts are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get date ranges for current and previous month
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    console.log(`Analyzing attendance from ${previousMonthStart.toISOString()} to ${today.toISOString()}`);

    // Get all active members with email
    const { data: members, error: membersError } = await supabaseClient
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("status", "active")
      .not("email", "is", null);

    if (membersError) {
      console.error("Error querying members:", membersError);
      throw membersError;
    }

    // Get attendance records for the past 2 months
    const { data: attendanceRecords, error: attendanceError } = await supabaseClient
      .from("attendance_records")
      .select("member_id, event_date")
      .gte("event_date", previousMonthStart.toISOString().split("T")[0])
      .lte("event_date", today.toISOString().split("T")[0]);

    if (attendanceError) {
      console.error("Error querying attendance:", attendanceError);
      throw attendanceError;
    }

    // Calculate expected services (assuming 4 Sundays + 4 Wednesdays per month = 8)
    const expectedServicesPerMonth = 8;

    // Analyze attendance decline for each member
    const alerts: AttendanceAlert[] = [];

    for (const member of members || []) {
      const memberAttendance = attendanceRecords?.filter(
        (record) => record.member_id === member.id
      ) || [];

      // Count current month attendance
      const currentMonthAttendance = memberAttendance.filter((record) => {
        const recordDate = new Date(record.event_date);
        return recordDate >= currentMonthStart;
      }).length;

      // Count previous month attendance
      const previousMonthAttendance = memberAttendance.filter((record) => {
        const recordDate = new Date(record.event_date);
        return recordDate >= previousMonthStart && recordDate <= previousMonthEnd;
      }).length;

      // Calculate rates
      const currentMonthRate = (currentMonthAttendance / expectedServicesPerMonth) * 100;
      const previousMonthRate = (previousMonthAttendance / expectedServicesPerMonth) * 100;

      // Check for significant decline (>30% drop or no attendance this month but had attendance last month)
      const declinePercentage = previousMonthRate > 0 
        ? ((previousMonthRate - currentMonthRate) / previousMonthRate) * 100 
        : 0;

      const hasSignificantDecline = declinePercentage > 30 || 
        (previousMonthAttendance > 0 && currentMonthAttendance === 0);

      if (hasSignificantDecline && member.email) {
        // Get last attendance date
        const sortedAttendance = memberAttendance.sort(
          (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        );
        const lastAttendance = sortedAttendance[0]?.event_date || null;

        alerts.push({
          memberId: member.id,
          memberName: `${member.first_name} ${member.last_name}`,
          email: member.email,
          currentMonthRate,
          previousMonthRate,
          declinePercentage,
          lastAttendance,
        });
      }
    }

    console.log(`Found ${alerts.length} members with declining attendance`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const alert of alerts) {
      const safeMemberName = escapeHtml(alert.memberName);
      const attendanceRate = `${alert.currentMonthRate.toFixed(0)}%`;

      // Prepare template variables
      const variables = {
        member_name: safeMemberName,
        attendance_rate: attendanceRate,
      };

      // Use custom template or default
      const emailSubject = template?.subject 
        ? replaceTemplateVariables(template.subject, variables)
        : "💙 Nous pensons à vous";
      
      const emailBody = template?.body_html 
        ? replaceTemplateVariables(template.body_html, variables)
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">💙 Nous pensons à vous</h1>
            <p style="font-size: 18px;">Bonjour ${safeMemberName},</p>
            <p>Nous avons remarqué que nous ne vous avons pas vu récemment à l'église et nous voulions simplement vous faire savoir que vous nous manquez.</p>
            <p>Votre présence nous manque! Si vous traversez une période difficile ou si vous avez besoin de soutien, n'hésitez pas à nous contacter.</p>
            <p>Avec amour,<br><strong>Votre église</strong></p>
          </div>
        `;

      try {
        const emailResponse = await resend.emails.send({
          from: "Église <onboarding@resend.dev>",
          to: [alert.email],
          subject: emailSubject,
          html: emailBody,
        });

        successCount++;
        console.log(`Absence alert sent to ${alert.email}`);
        results.push({ member_id: alert.memberId, success: true });
      } catch (emailError: any) {
        errorCount++;
        console.error(`Failed to send alert to ${alert.email}:`, emailError);
        results.push({ member_id: alert.memberId, success: false, error: emailError.message });
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Attendance alerts sent: ${successCount} success, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Processed ${alerts.length} attendance alerts`,
        successCount,
        errorCount,
        alerts: alerts.map(a => ({ 
          name: a.memberName, 
          decline: a.declinePercentage.toFixed(0) + '%',
          lastAttendance: a.lastAttendance 
        }))
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-attendance-alerts function:", error);
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
