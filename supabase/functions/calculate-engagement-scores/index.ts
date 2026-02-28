import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberEngagementData {
  member_id: string;
  tenant_id: string;
  attendance_records: { event_date: string }[];
  donations: { amount: number; donation_date: string }[];
  ministry_memberships: { role: string }[];
  baptism_date: string | null;
  conversion_date: string | null;
  join_date: string | null;
  previous_score: number | null;
}

// Calculate attendance score (40% weight)
function calculateAttendanceScore(attendanceRecords: { event_date: string }[], daysWindow: number = 90): { score: number; count: number; lastDate: Date | null } {
  const now = new Date();
  const windowStart = new Date(now.getTime() - daysWindow * 24 * 60 * 60 * 1000);
  
  const recentAttendance = attendanceRecords.filter(r => {
    const date = new Date(r.event_date);
    return date >= windowStart && date <= now;
  });
  
  // Assume ~12 Sundays in 90 days as baseline
  const expectedAttendance = Math.floor(daysWindow / 7);
  const attendanceRate = Math.min(recentAttendance.length / expectedAttendance, 1);
  
  // Score 0-100 based on attendance rate
  const score = Math.round(attendanceRate * 100);
  
  // Find last attendance date
  const sortedDates = recentAttendance
    .map(r => new Date(r.event_date))
    .sort((a, b) => b.getTime() - a.getTime());
  
  return {
    score,
    count: recentAttendance.length,
    lastDate: sortedDates.length > 0 ? sortedDates[0] : null
  };
}

// Calculate giving score (25% weight) - based on consistency, not amount
function calculateGivingScore(donations: { amount: number; donation_date: string }[], monthsWindow: number = 6): { score: number; consistency: number } {
  const now = new Date();
  const windowStart = new Date(now.getTime() - monthsWindow * 30 * 24 * 60 * 60 * 1000);
  
  const recentDonations = donations.filter(d => {
    const date = new Date(d.donation_date);
    return date >= windowStart && date <= now;
  });
  
  // Calculate months with at least one donation
  const monthsWithDonations = new Set(
    recentDonations.map(d => {
      const date = new Date(d.donation_date);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })
  ).size;
  
  // Consistency = percentage of months with donations
  const consistency = monthsWithDonations / monthsWindow;
  
  // Bonus for regular giving (multiple donations)
  const frequencyBonus = Math.min(recentDonations.length / (monthsWindow * 2), 0.2);
  
  const score = Math.round(Math.min((consistency + frequencyBonus) * 100, 100));
  
  return { score, consistency: Math.round(consistency * 100) };
}

// Calculate ministry score (20% weight)
function calculateMinistryScore(ministryMemberships: { role: string }[]): number {
  if (ministryMemberships.length === 0) return 0;
  
  let score = 0;
  
  // Base score for being in any ministry
  score += 30;
  
  // Additional score per ministry (max 3 ministries counted)
  const ministryCount = Math.min(ministryMemberships.length, 3);
  score += ministryCount * 15;
  
  // Leadership bonus
  const leadershipRoles = ministryMemberships.filter(m => 
    ['leader', 'coordinator', 'responsable', 'directeur'].some(r => 
      m.role?.toLowerCase().includes(r)
    )
  );
  
  if (leadershipRoles.length > 0) {
    score += 25;
  }
  
  return Math.min(score, 100);
}

// Calculate spiritual growth score (15% weight)
function calculateGrowthScore(
  baptismDate: string | null,
  conversionDate: string | null,
  joinDate: string | null
): number {
  let score = 0;
  
  // Base score for being a member
  if (joinDate) score += 20;
  
  // Conversion milestone
  if (conversionDate) score += 30;
  
  // Baptism milestone
  if (baptismDate) score += 50;
  
  return Math.min(score, 100);
}

// Determine trend based on previous score
function determineTrend(currentScore: number, previousScore: number | null): { trend: string; change: number } {
  if (previousScore === null) {
    return { trend: 'stable', change: 0 };
  }
  
  const change = currentScore - previousScore;
  
  if (change >= 5) {
    return { trend: 'improving', change };
  } else if (change <= -5) {
    return { trend: 'declining', change };
  } else {
    return { trend: 'stable', change };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow both CRON_SECRET (scheduled) and authenticated user (manual) access
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const isCronCall = expectedSecret && authHeader === `Bearer ${expectedSecret}`;
  
  if (!isCronCall) {
    // Check if the caller is an authenticated user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Unauthorized access attempt to calculate-engagement-scores");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
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
      // No body or invalid JSON, process all tenants
    }

    console.log(`Starting engagement score calculation${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}`);

    // Fetch all active members with their related data
    let membersQuery = supabase
      .from('members')
      .select(`
        id,
        tenant_id,
        baptism_date,
        conversion_date,
        join_date,
        status
      `)
      .eq('status', 'active');
    
    if (tenantId) {
      membersQuery = membersQuery.eq('tenant_id', tenantId);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error("Error fetching members:", membersError);
      throw membersError;
    }

    console.log(`Processing ${members?.length || 0} active members`);

    const results: { updated: number; errors: number } = { updated: 0, errors: 0 };

    for (const member of members || []) {
      try {
        // Fetch attendance records (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select('event_date')
          .eq('member_id', member.id)
          .gte('event_date', ninetyDaysAgo.toISOString().split('T')[0]);

        // Fetch donations (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: donations } = await supabase
          .from('donations')
          .select('amount, donation_date')
          .eq('member_id', member.id)
          .gte('donation_date', sixMonthsAgo.toISOString().split('T')[0]);

        // Fetch ministry memberships
        const { data: ministryMemberships } = await supabase
          .from('ministry_members')
          .select('role')
          .eq('member_id', member.id);

        // Fetch previous score for trend calculation
        const { data: previousScoreData } = await supabase
          .from('member_engagement_scores')
          .select('total_score')
          .eq('member_id', member.id)
          .maybeSingle();

        // Calculate individual scores
        const attendanceResult = calculateAttendanceScore(attendanceRecords || []);
        const givingResult = calculateGivingScore(donations || []);
        const ministryScore = calculateMinistryScore(ministryMemberships || []);
        const growthScore = calculateGrowthScore(
          member.baptism_date,
          member.conversion_date,
          member.join_date
        );

        // Calculate weighted total score
        const totalScore = Math.round(
          attendanceResult.score * 0.40 +
          givingResult.score * 0.25 +
          ministryScore * 0.20 +
          growthScore * 0.15
        );

        // Determine trend
        const { trend, change } = determineTrend(totalScore, previousScoreData?.total_score || null);

        // Upsert engagement score
        const { error: upsertError } = await supabase
          .from('member_engagement_scores')
          .upsert({
            member_id: member.id,
            tenant_id: member.tenant_id,
            attendance_score: attendanceResult.score,
            giving_score: givingResult.score,
            ministry_score: ministryScore,
            growth_score: growthScore,
            total_score: totalScore,
            trend,
            trend_change: change,
            last_attendance_date: attendanceResult.lastDate?.toISOString().split('T')[0] || null,
            attendance_count_90d: attendanceResult.count,
            giving_consistency: givingResult.consistency,
            calculated_at: new Date().toISOString()
          }, {
            onConflict: 'member_id'
          });

        if (upsertError) {
          console.error(`Error upserting score for member ${member.id}:`, upsertError);
          results.errors++;
        } else {
          results.updated++;
        }
      } catch (memberError) {
        console.error(`Error processing member ${member.id}:`, memberError);
        results.errors++;
      }
    }

    console.log(`Engagement score calculation complete. Updated: ${results.updated}, Errors: ${results.errors}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${members?.length || 0} members`,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in calculate-engagement-scores:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
