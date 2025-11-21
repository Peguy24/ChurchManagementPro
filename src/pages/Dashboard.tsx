import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, DollarSign, Cake, Building2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, isWithinInterval, addDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  // Fetch members data
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, date_of_birth, photo_url, baptism_status, baptism_date, created_at")
        .eq("status", "active");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch branches data
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, status")
        .eq("status", "active");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ministries data
  const { data: ministries } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ministries")
        .select("id, name, status")
        .eq("status", "active");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent members (last 30 days)
  const { data: recentMembers } = useQuery({
    queryKey: ["recentMembers"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, created_at, status")
        .eq("status", "active")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch donations data
  const { data: donations } = useQuery({
    queryKey: ["donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donation_type, donation_date, payment_method");
      
      if (error) throw error;
      return data || [];
    },
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

  const monthlyDonations = donations?.filter(d => 
    new Date(d.donation_date) >= firstDayOfMonth
  ) || [];
  
  const weeklyDonations = donations?.filter(d => 
    new Date(d.donation_date) >= firstDayOfWeek
  ) || [];

  const totalMonthlyAmount = monthlyDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalWeeklyAmount = weeklyDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  
  const paidThisWeek = weeklyDonations.filter(d => d.donation_type === 'tithe').length;
  const unpaidThisWeek = totalMembers - paidThisWeek;

  const stats = [
    {
      title: "Total Manm",
      value: totalMembers.toString(),
      detail: `${totalMembers} manm aktif`,
      icon: Users,
      bgColor: "bg-[hsl(var(--blue))]",
      textColor: "text-[hsl(var(--blue-foreground))]",
    },
    {
      title: "Total Batize",
      value: totalBaptized.toString(),
      detail: `${totalBaptized > 0 ? Math.round((totalBaptized / totalMembers) * 100) : 0}% manm`,
      icon: TrendingUp,
      bgColor: "bg-[hsl(var(--dark))]",
      textColor: "text-[hsl(var(--dark-foreground))]",
    },
    {
      title: "Total Dim Semèn",
      value: paidThisWeek.toString(),
      detail: `Peye: ${paidThisWeek} • Pa Peye: ${unpaidThisWeek}`,
      icon: DollarSign,
      bgColor: "bg-[hsl(var(--red))]",
      textColor: "text-[hsl(var(--red-foreground))]",
    },
    {
      title: "Total Ofrand Mwa Sa",
      value: `$${totalMonthlyAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      detail: `${monthlyDonations.length} don`,
      icon: DollarSign,
      bgColor: "bg-[hsl(var(--cyan))]",
      textColor: "text-[hsl(var(--cyan-foreground))]",
    },
    {
      title: "Total Branch",
      value: totalBranches.toString(),
      detail: `${totalBranches} branch aktif`,
      icon: Building2,
      bgColor: "bg-[hsl(var(--yellow))]",
      textColor: "text-[hsl(var(--yellow-foreground))]",
    },
    {
      title: "Total Ministè",
      value: totalMinistries.toString(),
      detail: `${totalMinistries} ministè aktif`,
      icon: Users,
      bgColor: "bg-[hsl(var(--green))]",
      textColor: "text-[hsl(var(--green-foreground))]",
    },
  ];

  const nextWeek = addDays(today, 7);

  // Filter members with birthdays today
  const todayBirthdays = members?.filter((member) => {
    if (!member.date_of_birth) return false;
    const birthDate = new Date(member.date_of_birth);
    return (
      birthDate.getMonth() === today.getMonth() &&
      birthDate.getDate() === today.getDate()
    );
  }) || [];

  // Filter members with upcoming birthdays (next 7 days, excluding today)
  const upcomingBirthdays = members?.filter((member) => {
    if (!member.date_of_birth) return false;
    const birthDate = new Date(member.date_of_birth);
    
    // Create a date this year with the member's birth month/day
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    // If birthday already passed this year, check next year
    if (thisYearBirthday < today) {
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      return isWithinInterval(nextYearBirthday, { start: addDays(today, 1), end: nextWeek });
    }
    
    return isWithinInterval(thisYearBirthday, { start: addDays(today, 1), end: nextWeek });
  }).sort((a, b) => {
    // Sort by upcoming date
    const aDate = new Date(today.getFullYear(), new Date(a.date_of_birth!).getMonth(), new Date(a.date_of_birth!).getDate());
    const bDate = new Date(today.getFullYear(), new Date(b.date_of_birth!).getMonth(), new Date(b.date_of_birth!).getDate());
    if (aDate < today) aDate.setFullYear(today.getFullYear() + 1);
    if (bDate < today) bDate.setFullYear(today.getFullYear() + 1);
    return aDate.getTime() - bDate.getTime();
  }) || [];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Byenveni nan sistèm jesyon legliz ou
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className={`${stat.bgColor} border-none shadow-lg`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium mb-2 ${stat.textColor} opacity-90`}>
                        {stat.title}
                      </p>
                      <h3 className={`text-4xl font-bold mb-2 ${stat.textColor}`}>
                        {stat.value}
                      </h3>
                      <p className={`text-xs ${stat.textColor} opacity-80`}>
                        {stat.detail}
                      </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                      <Icon className={`h-8 w-8 ${stat.textColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Today's Birthdays */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-primary" />
                Fèt Jodi a
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Pa gen fèt jodi a
                </p>
              ) : (
                <div className="space-y-4">
                  {todayBirthdays.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg bg-primary/5 p-3"
                    >
                      <Avatar>
                        <AvatarImage src={member.photo_url || undefined} />
                        <AvatarFallback>
                          {member.first_name[0]}{member.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          🎉 Bon Fèt!
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
                Fèt Kap Vini
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Pa gen fèt semèn pwochèn
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingBirthdays.slice(0, 5).map((member) => {
                    const birthDate = new Date(member.date_of_birth!);
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

        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Members */}
          <Card>
            <CardHeader>
              <CardTitle>Manm Resan</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentMembers || recentMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Pa gen nouvo manm 30 dènye jou yo
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
                          Rantre: {format(new Date(member.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                        Aktif
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
              <CardTitle>Rezime Estatistik</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Branch Aktif</p>
                    <p className="text-sm text-muted-foreground">
                      Total branch nan sistèm
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {totalBranches}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Ministè Aktif</p>
                    <p className="text-sm text-muted-foreground">
                      Total ministè nan legliz
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-success">
                    {totalMinistries}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">To Batize</p>
                    <p className="text-sm text-muted-foreground">
                      {totalBaptized > 0 ? Math.round((totalBaptized / totalMembers) * 100) : 0}% manm batize
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
