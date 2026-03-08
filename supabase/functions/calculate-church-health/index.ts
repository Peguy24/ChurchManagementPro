import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check super admin
    const { data: isAdmin } = await supabase.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all tenants
    const { data: tenants, error: tenantsErr } = await supabase
      .from("tenants")
      .select("id, name");
    if (tenantsErr) throw tenantsErr;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const scores = [];

    for (const tenant of tenants || []) {
      const tid = tenant.id;

      // 1. Members
      const { count: totalMembers } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tid);

      // 2. Attendance in last 30 days
      const { data: recentAttendance } = await supabase
        .from("attendance_records")
        .select("member_id")
        .eq("tenant_id", tid)
        .gte("event_date", thirtyDaysAgo);

      const uniqueAttendees = new Set((recentAttendance || []).map((a) => a.member_id));
      const activeMembers30d = uniqueAttendees.size;
      const attendanceRate = (totalMembers || 0) > 0 ? (activeMembers30d / (totalMembers || 1)) * 100 : 0;

      // 3. Donations in last 30 days
      const { data: recentDonations } = await supabase
        .from("donations")
        .select("amount")
        .eq("tenant_id", tid)
        .gte("donation_date", thirtyDaysAgo);

      const totalDonations30d = (recentDonations || []).reduce((s, d) => s + (d.amount || 0), 0);
      const avgDonation = (recentDonations || []).length > 0
        ? totalDonations30d / recentDonations!.length
        : 0;

      // 4. Feature adoption check
      const featureChecks = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("ministries").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("expenses").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("tenant_id", tid).then(r => (r.count || 0) > 0),
      ]);
      const featuresUsed = featureChecks.filter(Boolean).length;
      const featuresTotal = 8;

      // Compute component scores (0-100 each)
      const memberEngagementScore = Math.min(100, ((totalMembers || 0) >= 10 ? 40 : (totalMembers || 0) * 4) + (activeMembers30d >= 5 ? 60 : activeMembers30d * 12));
      const attendanceScoreVal = Math.min(100, attendanceRate * 1.5 + ((recentAttendance || []).length >= 10 ? 30 : (recentAttendance || []).length * 3));
      const donationScoreVal = Math.min(100, ((recentDonations || []).length >= 10 ? 50 : (recentDonations || []).length * 5) + (totalDonations30d >= 1000 ? 50 : totalDonations30d * 0.05));
      const featureAdoptionScore = (featuresUsed / featuresTotal) * 100;

      // Overall = weighted average
      const overall = Math.round(
        memberEngagementScore * 0.3 +
        attendanceScoreVal * 0.25 +
        donationScoreVal * 0.25 +
        featureAdoptionScore * 0.2
      );

      // Grade
      let grade = "F";
      if (overall >= 90) grade = "A+";
      else if (overall >= 80) grade = "A";
      else if (overall >= 70) grade = "B";
      else if (overall >= 60) grade = "C";
      else if (overall >= 40) grade = "D";

      scores.push({
        tenant_id: tid,
        overall_score: overall,
        member_engagement_score: Math.round(memberEngagementScore),
        attendance_score: Math.round(attendanceScoreVal),
        donation_score: Math.round(donationScoreVal),
        feature_adoption_score: Math.round(featureAdoptionScore),
        total_members: totalMembers || 0,
        active_members_30d: activeMembers30d,
        attendance_rate_30d: Math.round(attendanceRate * 10) / 10,
        total_donations_30d: Math.round(totalDonations30d * 100) / 100,
        avg_donation: Math.round(avgDonation * 100) / 100,
        features_used: featuresUsed,
        features_total: featuresTotal,
        health_grade: grade,
        trend: "stable",
        details: {
          feature_list: ["members", "attendance", "donations", "events", "ministries", "branches", "expenses", "inventory"]
            .filter((_, i) => featureChecks[i]),
        },
        calculated_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }

    // Upsert all scores
    if (scores.length > 0) {
      const { error: upsertErr } = await supabase
        .from("tenant_health_scores")
        .upsert(scores, { onConflict: "tenant_id" });
      if (upsertErr) throw upsertErr;
    }

    return new Response(
      JSON.stringify({ success: true, computed: scores.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
