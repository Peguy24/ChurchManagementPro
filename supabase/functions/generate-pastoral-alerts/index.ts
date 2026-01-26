import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberData {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  join_date: string | null;
  baptism_date: string | null;
  conversion_date: string | null;
}

interface EngagementScore {
  member_id: string;
  total_score: number;
  trend: string;
  trend_change: number;
  last_attendance_date: string | null;
  attendance_count_90d: number;
}

interface RiskPrediction {
  member_id: string;
  risk_category: string;
  risk_probability: number;
  contributing_factors: string[];
}

// Check if alert already exists (to avoid duplicates)
async function alertExists(supabase: any, memberId: string, alertType: string, daysBack: number = 7): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const { data } = await supabase
    .from('pastoral_alerts')
    .select('id')
    .eq('member_id', memberId)
    .eq('alert_type', alertType)
    .gte('created_at', cutoffDate.toISOString())
    .maybeSingle();
  
  return !!data;
}

serve(async (req) => {
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
    console.error("Unauthorized access attempt to generate-pastoral-alerts");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional tenant_id filter
    let tenantId: string | null = null;
    try {
      const body = await req.json();
      tenantId = body.tenant_id || null;
    } catch {
      // No body or invalid JSON
    }

    console.log(`Starting pastoral alert generation${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}`);

    const alertsCreated: { type: string; count: number }[] = [];
    let totalAlerts = 0;

    // 1. HIGH CHURN RISK ALERTS
    let highRiskQuery = supabase
      .from('member_risk_predictions')
      .select(`
        member_id,
        risk_category,
        risk_probability,
        contributing_factors,
        tenant_id,
        members!inner (
          first_name,
          last_name
        )
      `)
      .eq('risk_category', 'high');
    
    if (tenantId) {
      highRiskQuery = highRiskQuery.eq('tenant_id', tenantId);
    }

    const { data: highRiskMembers } = await highRiskQuery;
    
    let highRiskCount = 0;
    for (const member of highRiskMembers || []) {
      if (await alertExists(supabase, member.member_id, 'high_churn_risk', 14)) continue;
      
      const memberData = Array.isArray(member.members) ? member.members[0] : member.members;
      const memberName = `${memberData?.first_name || ''} ${memberData?.last_name || ''}`;
      const factors = (member.contributing_factors || []).join(', ');
      
      await supabase.from('pastoral_alerts').insert({
        member_id: member.member_id,
        tenant_id: member.tenant_id,
        alert_type: 'high_churn_risk',
        priority: 'high',
        title: `Risque élevé de départ: ${memberName}`,
        message: `${memberName} présente un risque élevé de désengagement (${Math.round(member.risk_probability * 100)}%). ${factors ? `Facteurs: ${factors}` : ''}`,
        action_suggested: 'Planifier un appel pastoral ou une visite dans les 48h',
        metadata: { risk_probability: member.risk_probability, factors: member.contributing_factors }
      });
      highRiskCount++;
    }
    if (highRiskCount > 0) alertsCreated.push({ type: 'high_churn_risk', count: highRiskCount });
    totalAlerts += highRiskCount;

    // 2. ENGAGEMENT DROP ALERTS
    let engagementDropQuery = supabase
      .from('member_engagement_scores')
      .select(`
        member_id,
        total_score,
        trend,
        trend_change,
        tenant_id,
        members!inner (
          first_name,
          last_name
        )
      `)
      .eq('trend', 'declining')
      .lt('trend_change', -10);
    
    if (tenantId) {
      engagementDropQuery = engagementDropQuery.eq('tenant_id', tenantId);
    }

    const { data: decliningMembers } = await engagementDropQuery;
    
    let engagementDropCount = 0;
    for (const member of decliningMembers || []) {
      if (await alertExists(supabase, member.member_id, 'engagement_drop', 14)) continue;
      
      const memberData = Array.isArray(member.members) ? member.members[0] : member.members;
      const memberName = `${memberData?.first_name || ''} ${memberData?.last_name || ''}`;
      
      await supabase.from('pastoral_alerts').insert({
        member_id: member.member_id,
        tenant_id: member.tenant_id,
        alert_type: 'engagement_drop',
        priority: 'medium',
        title: `Baisse d'engagement: ${memberName}`,
        message: `Le score d'engagement de ${memberName} a diminué de ${Math.abs(member.trend_change)} points. Score actuel: ${member.total_score}/100.`,
        action_suggested: 'Vérifier si le membre traverse une période difficile',
        metadata: { score: member.total_score, change: member.trend_change }
      });
      engagementDropCount++;
    }
    if (engagementDropCount > 0) alertsCreated.push({ type: 'engagement_drop', count: engagementDropCount });
    totalAlerts += engagementDropCount;

    // 3. ATTENDANCE CLIFF ALERTS (no attendance in last 30+ days)
    let attendanceCliffQuery = supabase
      .from('member_engagement_scores')
      .select(`
        member_id,
        last_attendance_date,
        attendance_count_90d,
        tenant_id,
        members!inner (
          first_name,
          last_name,
          status
        )
      `)
      .eq('members.status', 'active');
    
    if (tenantId) {
      attendanceCliffQuery = attendanceCliffQuery.eq('tenant_id', tenantId);
    }

    const { data: attendanceData } = await attendanceCliffQuery;
    
    let attendanceCliffCount = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    for (const member of attendanceData || []) {
      const lastAttendance = member.last_attendance_date ? new Date(member.last_attendance_date) : null;
      
      if (!lastAttendance || lastAttendance < thirtyDaysAgo) {
      if (await alertExists(supabase, member.member_id, 'attendance_cliff', 14)) continue;
        
        const memberData = Array.isArray(member.members) ? member.members[0] : member.members;
        const memberName = `${memberData?.first_name || ''} ${memberData?.last_name || ''}`;
        const daysSince = lastAttendance
          ? Math.floor((Date.now() - lastAttendance.getTime()) / (24 * 60 * 60 * 1000))
          : null;
        
        await supabase.from('pastoral_alerts').insert({
          member_id: member.member_id,
          tenant_id: member.tenant_id,
          alert_type: 'attendance_cliff',
          priority: daysSince && daysSince > 45 ? 'high' : 'medium',
          title: `Absence prolongée: ${memberName}`,
          message: daysSince 
            ? `${memberName} n'a pas été présent depuis ${daysSince} jours.`
            : `Aucune présence enregistrée pour ${memberName} récemment.`,
          action_suggested: 'Appeler le membre pour prendre des nouvelles',
          metadata: { days_absent: daysSince, last_attendance: member.last_attendance_date }
        });
        attendanceCliffCount++;
      }
    }
    if (attendanceCliffCount > 0) alertsCreated.push({ type: 'attendance_cliff', count: attendanceCliffCount });
    totalAlerts += attendanceCliffCount;

    // 4. BIRTHDAY UPCOMING ALERTS (next 7 days)
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    let birthdayQuery = supabase
      .from('members')
      .select('id, tenant_id, first_name, last_name, date_of_birth')
      .eq('status', 'active')
      .not('date_of_birth', 'is', null);
    
    if (tenantId) {
      birthdayQuery = birthdayQuery.eq('tenant_id', tenantId);
    }

    const { data: membersWithBirthdays } = await birthdayQuery;
    
    let birthdayCount = 0;
    for (const member of membersWithBirthdays || []) {
      if (!member.date_of_birth) continue;
      
      const birthday = new Date(member.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      
      if (thisYearBirthday >= today && thisYearBirthday <= sevenDaysFromNow) {
        if (await alertExists(supabase, member.id, 'birthday_upcoming', 30)) continue;
        
        const memberName = `${member.first_name} ${member.last_name}`;
        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const age = today.getFullYear() - birthday.getFullYear();
        
        await supabase.from('pastoral_alerts').insert({
          member_id: member.id,
          tenant_id: member.tenant_id,
          alert_type: 'birthday_upcoming',
          priority: 'celebration',
          title: daysUntil === 0 ? `🎂 Anniversaire aujourd'hui: ${memberName}` : `🎂 Anniversaire dans ${daysUntil} jour(s): ${memberName}`,
          message: `${memberName} ${daysUntil === 0 ? 'fête' : 'fêtera'} ses ${age} ans${daysUntil === 0 ? " aujourd'hui" : ''}.`,
          action_suggested: 'Envoyer un message de vœux',
          metadata: { birthday: member.date_of_birth, age, days_until: daysUntil },
          expires_at: new Date(thisYearBirthday.getTime() + 24 * 60 * 60 * 1000).toISOString()
        });
        birthdayCount++;
      }
    }
    if (birthdayCount > 0) alertsCreated.push({ type: 'birthday_upcoming', count: birthdayCount });
    totalAlerts += birthdayCount;

    // 5. MEMBERSHIP ANNIVERSARY ALERTS (this month)
    let anniversaryQuery = supabase
      .from('members')
      .select('id, tenant_id, first_name, last_name, join_date')
      .eq('status', 'active')
      .not('join_date', 'is', null);
    
    if (tenantId) {
      anniversaryQuery = anniversaryQuery.eq('tenant_id', tenantId);
    }

    const { data: membersWithJoinDates } = await anniversaryQuery;
    
    let anniversaryCount = 0;
    for (const member of membersWithJoinDates || []) {
      if (!member.join_date) continue;
      
      const joinDate = new Date(member.join_date);
      if (joinDate.getMonth() === today.getMonth() && joinDate.getDate() >= today.getDate() && joinDate.getDate() <= today.getDate() + 7) {
        const yearsInChurch = today.getFullYear() - joinDate.getFullYear();
        
        if (yearsInChurch >= 1 && yearsInChurch % 5 === 0) { // Only celebrate 5, 10, 15... year anniversaries
          if (await alertExists(supabase, member.id, 'membership_anniversary', 30)) continue;
          
          const memberName = `${member.first_name} ${member.last_name}`;
          
          await supabase.from('pastoral_alerts').insert({
            member_id: member.id,
            tenant_id: member.tenant_id,
            alert_type: 'membership_anniversary',
            priority: 'celebration',
            title: `🎉 ${yearsInChurch} ans de fidélité: ${memberName}`,
            message: `${memberName} célèbre ${yearsInChurch} ans au sein de l'église ce mois-ci.`,
            action_suggested: 'Préparer une reconnaissance lors du culte',
            metadata: { join_date: member.join_date, years: yearsInChurch }
          });
          anniversaryCount++;
        }
      }
    }
    if (anniversaryCount > 0) alertsCreated.push({ type: 'membership_anniversary', count: anniversaryCount });
    totalAlerts += anniversaryCount;

    // 6. SPIRITUAL MILESTONE ALERTS (baptism anniversaries)
    let baptismQuery = supabase
      .from('members')
      .select('id, tenant_id, first_name, last_name, baptism_date')
      .eq('status', 'active')
      .not('baptism_date', 'is', null);
    
    if (tenantId) {
      baptismQuery = baptismQuery.eq('tenant_id', tenantId);
    }

    const { data: membersWithBaptism } = await baptismQuery;
    
    let milestoneCount = 0;
    for (const member of membersWithBaptism || []) {
      if (!member.baptism_date) continue;
      
      const baptismDate = new Date(member.baptism_date);
      // Check for 1-year baptism anniversary (within next 7 days)
      const oneYearAnniversary = new Date(baptismDate);
      oneYearAnniversary.setFullYear(today.getFullYear());
      
      if (oneYearAnniversary >= today && oneYearAnniversary <= sevenDaysFromNow) {
        const yearsAfterBaptism = today.getFullYear() - baptismDate.getFullYear();
        
        if (yearsAfterBaptism === 1) {
          if (await alertExists(supabase, member.id, 'spiritual_milestone', 30)) continue;
          
          const memberName = `${member.first_name} ${member.last_name}`;
          
          await supabase.from('pastoral_alerts').insert({
            member_id: member.id,
            tenant_id: member.tenant_id,
            alert_type: 'spiritual_milestone',
            priority: 'celebration',
            title: `✝️ 1 an de baptême: ${memberName}`,
            message: `${memberName} célèbre le premier anniversaire de son baptême.`,
            action_suggested: 'Féliciter le membre et discuter de son parcours spirituel',
            metadata: { baptism_date: member.baptism_date, milestone: '1_year_baptism' }
          });
          milestoneCount++;
        }
      }
    }
    if (milestoneCount > 0) alertsCreated.push({ type: 'spiritual_milestone', count: milestoneCount });
    totalAlerts += milestoneCount;

    console.log(`Pastoral alert generation complete. Total alerts created: ${totalAlerts}`);
    console.log('Breakdown:', alertsCreated);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${totalAlerts} pastoral alerts`,
        breakdown: alertsCreated
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in generate-pastoral-alerts:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
