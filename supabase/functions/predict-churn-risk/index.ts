import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceRecord {
  event_date: string;
}

interface DonationRecord {
  donation_date: string;
  amount: number;
}

// Calculate linear regression slope for trend analysis
function calculateTrendSlope(values: number[]): number {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Group attendance by week for trend analysis
function groupAttendanceByWeek(records: AttendanceRecord[], weeksBack: number = 12): number[] {
  const now = new Date();
  const weeklyAttendance: number[] = new Array(weeksBack).fill(0);
  
  records.forEach(record => {
    const recordDate = new Date(record.event_date);
    const weeksAgo = Math.floor((now.getTime() - recordDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    if (weeksAgo >= 0 && weeksAgo < weeksBack) {
      weeklyAttendance[weeksBack - 1 - weeksAgo]++;
    }
  });
  
  return weeklyAttendance;
}

// Group giving by month for trend analysis
function groupGivingByMonth(donations: DonationRecord[], monthsBack: number = 6): number[] {
  const now = new Date();
  const monthlyGiving: number[] = new Array(monthsBack).fill(0);
  
  donations.forEach(donation => {
    const donationDate = new Date(donation.donation_date);
    const monthsAgo = (now.getFullYear() - donationDate.getFullYear()) * 12 + 
                       (now.getMonth() - donationDate.getMonth());
    
    if (monthsAgo >= 0 && monthsAgo < monthsBack) {
      monthlyGiving[monthsBack - 1 - monthsAgo] += donation.amount;
    }
  });
  
  return monthlyGiving;
}

// Logistic function for probability calculation
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Calculate churn risk probability using a simple logistic regression model
function calculateChurnRisk(
  daysSinceLastAttendance: number,
  attendanceTrendSlope: number,
  givingTrendSlope: number,
  engagementScore: number,
  tenureMonths: number
): { probability: number; factors: string[] } {
  const factors: string[] = [];
  
  // Feature weights (simplified logistic regression coefficients)
  const weights = {
    daysSinceAttendance: 0.03,    // Higher days = higher risk
    attendanceTrend: -2.0,        // Negative trend = higher risk
    givingTrend: -0.5,            // Negative trend = higher risk
    engagementScore: -0.04,       // Lower score = higher risk
    tenureBonus: -0.02            // Longer tenure = lower risk (up to a point)
  };
  
  // Calculate linear combination
  let z = 0;
  
  // Days since last attendance (capped at 90)
  const cappedDays = Math.min(daysSinceLastAttendance, 90);
  z += cappedDays * weights.daysSinceAttendance;
  if (daysSinceLastAttendance > 30) {
    factors.push(`absent_days:${daysSinceLastAttendance}`);
  }
  
  // Attendance trend
  z += attendanceTrendSlope * weights.attendanceTrend;
  if (attendanceTrendSlope < -0.1) {
    factors.push("declining_attendance");
  }
  
  // Giving trend
  z += givingTrendSlope * weights.givingTrend;
  if (givingTrendSlope < -50) {
    factors.push("declining_giving");
  }
  
  // Engagement score
  z += (100 - engagementScore) * weights.engagementScore;
  if (engagementScore < 40) {
    factors.push("Faible score d'engagement");
  }
  
  // Tenure bonus (new members are more at risk)
  const tenureBonus = Math.min(tenureMonths, 24);
  z += tenureBonus * weights.tenureBonus;
  if (tenureMonths < 6) {
    factors.push("Nouveau membre (moins de 6 mois)");
  }
  
  // Add bias term
  z -= 1.5; // Shift the sigmoid to reduce false positives
  
  const probability = sigmoid(z);
  
  return { probability, factors };
}

// Determine risk category
function getRiskCategory(probability: number): string {
  if (probability >= 0.6) return 'high';
  if (probability >= 0.3) return 'medium';
  return 'low';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow both CRON_SECRET (scheduled) and authenticated user (manual) access
  const authHeader = req.headers.get("Authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  const isCronCall = expectedSecret && authHeader === `Bearer ${expectedSecret}`;
  
  if (!isCronCall) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Unauthorized access attempt to predict-churn-risk");
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
      // No body or invalid JSON
    }

    console.log(`Starting churn risk prediction${tenantId ? ` for tenant ${tenantId}` : ' for all tenants'}`);

    // Fetch active members with their engagement scores
    let membersQuery = supabase
      .from('members')
      .select(`
        id,
        tenant_id,
        join_date,
        status,
        member_engagement_scores (
          total_score
        )
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

    console.log(`Processing ${members?.length || 0} active members for churn prediction`);

    const results = { updated: 0, errors: 0, highRisk: 0, mediumRisk: 0 };

    for (const member of members || []) {
      try {
        // Fetch attendance records (last 3 months for trend analysis)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select('event_date')
          .eq('member_id', member.id)
          .gte('event_date', threeMonthsAgo.toISOString().split('T')[0])
          .order('event_date', { ascending: true });

        // Fetch donations (last 6 months for trend analysis)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const { data: donations } = await supabase
          .from('donations')
          .select('donation_date, amount')
          .eq('member_id', member.id)
          .gte('donation_date', sixMonthsAgo.toISOString().split('T')[0])
          .order('donation_date', { ascending: true });

        // Calculate days since last attendance
        let daysSinceLastAttendance = 90; // Default high value
        if (attendanceRecords && attendanceRecords.length > 0) {
          const lastAttendance = new Date(attendanceRecords[attendanceRecords.length - 1].event_date);
          daysSinceLastAttendance = Math.floor((Date.now() - lastAttendance.getTime()) / (24 * 60 * 60 * 1000));
        }

        // Calculate attendance trend slope
        const weeklyAttendance = groupAttendanceByWeek(attendanceRecords || []);
        const attendanceTrendSlope = calculateTrendSlope(weeklyAttendance);

        // Calculate giving trend slope
        const monthlyGiving = groupGivingByMonth(donations || []);
        const givingTrendSlope = calculateTrendSlope(monthlyGiving);

        // Get engagement score
        const engagementScore = member.member_engagement_scores?.[0]?.total_score || 50;

        // Calculate tenure in months
        const joinDate = member.join_date ? new Date(member.join_date) : new Date();
        const tenureMonths = Math.floor((Date.now() - joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000));

        // Calculate churn risk
        const { probability, factors } = calculateChurnRisk(
          daysSinceLastAttendance,
          attendanceTrendSlope,
          givingTrendSlope,
          engagementScore,
          tenureMonths
        );

        const riskCategory = getRiskCategory(probability);

        // Calculate predicted inactive date (for high risk members)
        let predictedInactiveDate: string | null = null;
        if (riskCategory === 'high') {
          const weeksUntilInactive = Math.max(2, Math.floor((1 - probability) * 8));
          const inactiveDate = new Date();
          inactiveDate.setDate(inactiveDate.getDate() + weeksUntilInactive * 7);
          predictedInactiveDate = inactiveDate.toISOString().split('T')[0];
        }

        // Upsert risk prediction
        const { error: upsertError } = await supabase
          .from('member_risk_predictions')
          .upsert({
            member_id: member.id,
            tenant_id: member.tenant_id,
            risk_probability: Math.round(probability * 10000) / 10000,
            risk_category: riskCategory,
            contributing_factors: factors,
            days_since_last_attendance: daysSinceLastAttendance,
            attendance_trend_slope: Math.round(attendanceTrendSlope * 10000) / 10000,
            giving_trend_slope: Math.round(givingTrendSlope * 100) / 100,
            predicted_inactive_date: predictedInactiveDate,
            model_version: 'v1.0',
            predicted_at: new Date().toISOString()
          }, {
            onConflict: 'member_id'
          });

        if (upsertError) {
          console.error(`Error upserting risk for member ${member.id}:`, upsertError);
          results.errors++;
        } else {
          results.updated++;
          if (riskCategory === 'high') results.highRisk++;
          if (riskCategory === 'medium') results.mediumRisk++;
        }
      } catch (memberError) {
        console.error(`Error processing member ${member.id}:`, memberError);
        results.errors++;
      }
    }

    console.log(`Churn prediction complete. Updated: ${results.updated}, High Risk: ${results.highRisk}, Medium Risk: ${results.mediumRisk}, Errors: ${results.errors}`);

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
    console.error("Error in predict-churn-risk:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
