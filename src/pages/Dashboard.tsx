import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, DollarSign, Cake, Building2, Church } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isWithinInterval, addDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatDateInputValue, toSafeDate, parseDateOnly } from "@/lib/date";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignedAvatar } from "@/components/SignedAvatar";
import { useState, useMemo } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { PlanUsageCard } from "@/components/PlanUsageCard";
import { TrialCountdownCard } from "@/components/TrialCountdownCard";
import { OnboardingProgressCard } from "@/components/OnboardingProgressCard";
import { useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Star } from "lucide-react";
import LeaveReviewDialog from "@/components/LeaveReviewDialog";


export default function Dashboard() {
  const { t } = useLanguage();
  const { tenantId, tenant, loading: tenantLoading } = useCurrentTenant();
  const { formatAmount } = useCurrency();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [reviewOpen, setReviewOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, cardTitle: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 20;
    const y = (e.clientY - rect.top - rect.height / 2) / 20;
    setMousePosition({ x, y });
    setHoveredCard(cardTitle);
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
    setHoveredCard(null);
  };

  // Fetch members data filtered by tenant
  const { data: members } = useQuery({
    queryKey: ["members", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("members")
        .select("id, first_name, last_name, date_of_birth, photo_url, baptism_status, baptism_date, created_at")
        .eq("status", "active");
      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Fetch branches data filtered by tenant
  const { data: branches } = useQuery({
    queryKey: ["branches", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("branches")
        .select("id, name, status")
        .eq("status", "active");
      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Fetch ministries data filtered by tenant
  const { data: ministries } = useQuery({
    queryKey: ["ministries", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("ministries")
        .select("id, name, status")
        .eq("status", "active");
      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Fetch recent members (last 30 days) filtered by tenant
  const { data: recentMembers } = useQuery({
    queryKey: ["recentMembers", tenantId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from("members")
        .select("id, first_name, last_name, created_at, status")
        .eq("status", "active")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Fetch donations data filtered by tenant
  const { data: donations } = useQuery({
    queryKey: ["donations", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("donations")
        .select("id, amount, donation_type, donation_date, payment_method");
      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Fetch attendance data filtered by tenant
  const { data: attendanceRecords } = useQuery({
    queryKey: ["attendanceRecords", tenantId],
    queryFn: async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      let query = supabase
        .from("attendance_records")
        .select("id, event_date, member_id")
        .gte("event_date", formatDateInputValue(sixMonthsAgo));

      
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !tenantLoading,
  });

  // Calculate statistics
  const totalMembers = members?.length || 0;
  const totalBaptized = members?.filter(m => 
    m.baptism_status === "baptized" || m.baptism_date
  ).length || 0;
  const totalBranches = branches?.length || 0;
  const totalMinistries = ministries?.length || 0;

  // Calculate donations statistics
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay());

  const monthlyDonations = donations?.filter((d) => {
    const donationDate = toSafeDate(d.donation_date);
    return donationDate ? donationDate >= firstDayOfMonth : false;
  }) || [];
  
  const weeklyDonations = donations?.filter((d) => {
    const donationDate = toSafeDate(d.donation_date);
    return donationDate ? donationDate >= firstDayOfWeek : false;
  }) || [];


  const totalMonthlyAmount = monthlyDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  
  const weeklyAttendanceCount = attendanceRecords?.filter(a => {
    const eventDate = toSafeDate(a.event_date);
    return eventDate ? eventDate >= firstDayOfWeek : false;
  }).length || 0;

  const stats = [
    {
      title: t("dashboard.totalMembers"),
      value: totalMembers.toString(),
      detail: `${totalMembers} ${t("dashboard.activeMembers").toLowerCase()}`,
      icon: Users,
      bgColor: "bg-gradient-to-br from-cyan-400 to-cyan-500",
    },
    {
      title: t("dashboard.totalBaptized"),
      value: totalBaptized.toString(),
      detail: `${totalBaptized > 0 ? Math.round((totalBaptized / totalMembers) * 100) : 0}% ${t("nav.members").toLowerCase()}`,
      icon: TrendingUp,
      bgColor: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      title: t("dashboard.totalMinistries"),
      value: totalMinistries.toString(),
      detail: `${totalMinistries} ${t("common.activeMinistries").toLowerCase()}`,
      icon: Users,
      bgColor: "bg-gradient-to-br from-red-500 to-red-600",
    },
    {
      title: t("dashboard.weeklyAttendance"),
      value: weeklyAttendanceCount.toString(),
      detail: `${weeklyAttendanceCount} ${t("dashboard.membersPresent")}`,
      icon: Calendar,
      bgColor: "bg-gradient-to-br from-orange-400 to-orange-500",
    },
    {
      title: t("dashboard.totalBranches"),
      value: totalBranches.toString(),
      detail: `${totalBranches} ${t("dashboard.activeBranches")}`,
      icon: Building2,
      bgColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      title: t("dashboard.monthlyOfferings"),
      value: formatAmount(totalMonthlyAmount),
      detail: `${monthlyDonations.length} ${t("donations.donationCount").toLowerCase()}`,
      icon: DollarSign,
      bgColor: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
  ];

  const nextWeek = addDays(today, 7);

  // Prepare chart data for the last 6 months
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      // Count new members for this month
      const newMembersCount = members?.filter(m => {
        const createdDate = new Date(m.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length || 0;
      
      // Calculate total donations for this month
      const monthDonations = donations?.filter(d => {
        const donationDate = new Date(d.donation_date);
        return donationDate >= monthStart && donationDate <= monthEnd;
      }) || [];
      
      const totalDonationsAmount = monthDonations.reduce((sum, d) => sum + Number(d.amount), 0);
      
      // Count attendance for this month
      const monthAttendance = attendanceRecords?.filter(a => {
        const attendanceDate = new Date(a.event_date);
        return attendanceDate >= monthStart && attendanceDate <= monthEnd;
      }).length || 0;
      
      months.push({
        month: format(monthDate, "MMM yyyy"),
        membres: newMembersCount,
        donations: totalDonationsAmount,
        presence: monthAttendance,
      });
    }
    return months;
  }, [members, donations, attendanceRecords, today]);

  const chartConfig = {
    membres: {
      label: t("dashboard.newMembers"),
      color: "hsl(var(--cyan))",
    },
    donations: {
      label: t("nav.donations"),
      color: "hsl(var(--green))",
    },
    presence: {
      label: t("nav.attendance"),
      color: "hsl(var(--orange))",
    },
  };

  // Filter members with birthdays today
  const todayBirthdays = members?.filter((member) => {
    if (!member.date_of_birth) return false;
    const birthDate = parseDateOnly(member.date_of_birth) ?? new Date(member.date_of_birth);
    return (
      birthDate.getMonth() === today.getMonth() &&
      birthDate.getDate() === today.getDate()
    );
  }) || [];

  // Filter members with upcoming birthdays (next 7 days, excluding today)
  const upcomingBirthdays = members?.filter((member) => {
    if (!member.date_of_birth) return false;
    const birthDate = parseDateOnly(member.date_of_birth) ?? new Date(member.date_of_birth);
    
    // Create a date this year with the member's birth month/day
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    // If birthday already passed this year, check next year
    if (thisYearBirthday < today) {
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      return isWithinInterval(nextYearBirthday, { start: addDays(today, 1), end: nextWeek });
    }
    
    return isWithinInterval(thisYearBirthday, { start: addDays(today, 1), end: nextWeek });
  }).sort((a, b) => {
    const aBirth = parseDateOnly(a.date_of_birth!) ?? new Date(a.date_of_birth!);
    const bBirth = parseDateOnly(b.date_of_birth!) ?? new Date(b.date_of_birth!);
    const aDate = new Date(today.getFullYear(), aBirth.getMonth(), aBirth.getDate());
    const bDate = new Date(today.getFullYear(), bBirth.getMonth(), bBirth.getDate());
    if (aDate < today) aDate.setFullYear(today.getFullYear() + 1);
    if (bDate < today) bDate.setFullYear(today.getFullYear() + 1);
    return aDate.getTime() - bDate.getTime();
  }) || [];

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Church className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {tenant?.name || t("dashboard.title")}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                {tenant ? t("common.welcome") : t("dashboard.title")}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isHovered = hoveredCard === stat.title;
            return (
              <Card 
                key={stat.title} 
                className={`${stat.bgColor} border-none shadow-xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:brightness-110`}
                onMouseMove={(e) => handleMouseMove(e, stat.title)}
                onMouseLeave={handleMouseLeave}
              >
                <CardContent className="p-4 sm:p-8 relative z-10">
                  <div className="space-y-2 sm:space-y-4">
                    <div>
                      <h3 className="text-4xl sm:text-6xl font-bold text-white mb-1 transition-transform duration-300">
                        {stat.value}
                      </h3>
                      <p className="text-sm sm:text-lg font-medium text-white/90">
                        {stat.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 sm:pt-4 border-t border-white/20">
                      <p className="text-xs sm:text-sm text-white/80">
                        {stat.detail}
                      </p>
                    </div>
                  </div>
                </CardContent>
                {/* Large background icon with parallax */}
                <div 
                  className="absolute right-0 bottom-0 opacity-20 transition-all duration-200 ease-out"
                  style={{
                    transform: isHovered 
                      ? `translate(${24 + mousePosition.x}px, ${24 + mousePosition.y}px)` 
                      : 'translate(24px, 24px)'
                  }}
                >
                  <Icon className="h-24 w-24 sm:h-40 sm:w-40 text-white" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Members Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Users className="h-4 w-4" />
                {t("dashboard.membersTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ membres: chartConfig.membres }} className="h-[160px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 9 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="membres" 
                      stroke="var(--color-membres)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-membres)", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Donations Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <DollarSign className="h-4 w-4" />
                {t("dashboard.donationsTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ donations: chartConfig.donations }} className="h-[160px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 9 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="donations" 
                      stroke="var(--color-donations)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-donations)", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Attendance Chart */}
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="h-4 w-4" />
                {t("dashboard.attendanceTrend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ presence: chartConfig.presence }} className="h-[160px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month" 
                      className="text-xs"
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 9 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="presence" 
                      stroke="var(--color-presence)" 
                      strokeWidth={2}
                      dot={{ fill: "var(--color-presence)", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Today's Birthdays */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-primary" />
                {t("dashboard.todayBirthdays")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noBirthdayToday")}
                </p>
              ) : (
                <div className="space-y-4">
                  {todayBirthdays.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg bg-primary/5 p-3"
                    >
                      <SignedAvatar
                        storedUrl={member.photo_url}
                        bucket="member-photos"
                        fallbackText={`${member.first_name[0]}${member.last_name[0]}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          🎉 {t("common.happyBirthday")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Birthdays */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-secondary" />
                {t("dashboard.upcomingBirthdays")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noBirthdayNextWeek")}
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingBirthdays.slice(0, 5).map((member) => {
                    const birthDate = parseDateOnly(member.date_of_birth!) ?? new Date(member.date_of_birth!);
                    const thisYearBirthday = new Date(
                      today.getFullYear(),
                      birthDate.getMonth(),
                      birthDate.getDate()
                    );
                    if (thisYearBirthday < today) {
                      thisYearBirthday.setFullYear(today.getFullYear() + 1);
                    }
                    
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photo_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {member.first_name[0]}{member.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {member.first_name} {member.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(thisYearBirthday, "dd MMM")}
                            </p>
                          </div>
                        </div>
                        <Cake className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Onboarding Progress */}
        <OnboardingProgressCard />

        {/* Trial Countdown - show prominently if in trial */}
        <TrialCountdownCard />

        {/* Subscription & Usage Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <PlanUsageCard />
          <SubscriptionCard />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle>{t("common.recentMembers")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentMembers || recentMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("common.noRecentMembers")}
                </p>
              ) : (
                <div className="space-y-4">
                  {recentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("common.registeredOn")}: {format(new Date(member.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        {t("common.active")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("common.statisticsSummary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("common.activeBranches")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("common.totalBranchesInSystem")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {totalBranches}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("common.activeMinistries")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("common.totalMinistriesInChurch")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-success">
                    {totalMinistries}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("common.baptismRate")}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalBaptized > 0 ? Math.round((totalBaptized / totalMembers) * 100) : 0}% {t("common.baptizedMembers")}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-info">
                    {totalBaptized}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
