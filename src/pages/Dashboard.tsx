import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, DollarSign, Cake } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isSameDay, isWithinInterval, addDays } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const stats = [
  {
    title: "Total Manm",
    value: "248",
    detail: "Gason 120 • Fanm 128",
    icon: Users,
    bgColor: "bg-[hsl(var(--blue))]",
    textColor: "text-[hsl(var(--blue-foreground))]",
  },
  {
    title: "Total Batize",
    value: "186",
    detail: "75% manm",
    icon: TrendingUp,
    bgColor: "bg-[hsl(var(--dark))]",
    textColor: "text-[hsl(var(--dark-foreground))]",
  },
  {
    title: "Total Dim Semèn",
    value: "0",
    detail: "Peye: 0 • Pa Peye: 248",
    icon: DollarSign,
    bgColor: "bg-[hsl(var(--red))]",
    textColor: "text-[hsl(var(--red-foreground))]",
  },
  {
    title: "Total Ofrand Mwa Sa",
    value: "$8,450",
    detail: "+23% vs mwa pase",
    icon: DollarSign,
    bgColor: "bg-[hsl(var(--cyan))]",
    textColor: "text-[hsl(var(--cyan-foreground))]",
  },
  {
    title: "Total Branch",
    value: "5",
    detail: "Aktif",
    icon: Calendar,
    bgColor: "bg-[hsl(var(--yellow))]",
    textColor: "text-[hsl(var(--yellow-foreground))]",
  },
  {
    title: "Total Ministè",
    value: "12",
    detail: "Tout ministè",
    icon: Users,
    bgColor: "bg-[hsl(var(--green))]",
    textColor: "text-[hsl(var(--green-foreground))]",
  },
];

const recentMembers = [
  { name: "Jean Pierre", joined: "2025-01-15", status: "Aktif" },
  { name: "Marie Duval", joined: "2025-01-12", status: "Aktif" },
  { name: "Paul Joseph", joined: "2025-01-08", status: "Aktif" },
];

const upcomingEvents = [
  { name: "Sèvis Dimanch", date: "2025-01-21", time: "10:00 AM" },
  { name: "Etid Biblik", date: "2025-01-23", time: "7:00 PM" },
  { name: "Rankont Jèn", date: "2025-01-25", time: "6:00 PM" },
];

export default function Dashboard() {
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, date_of_birth, photo_url")
        .eq("status", "active");
      
      if (error) throw error;
      return data || [];
    },
  });

  const today = new Date();
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
              <div className="space-y-4">
                {recentMembers.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rantre: {member.joined}
                      </p>
                    </div>
                    <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      {member.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Evènman Kap Vini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.name}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.date} • {event.time}
                      </p>
                    </div>
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
