import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar, DollarSign } from "lucide-react";
import Layout from "@/components/Layout";

const stats = [
  {
    title: "Total Manm",
    value: "248",
    change: "+12 mwa sa",
    icon: Users,
    color: "text-primary",
  },
  {
    title: "Prezans Semèn",
    value: "186",
    change: "75% manm",
    icon: TrendingUp,
    color: "text-success",
  },
  {
    title: "Don Mwa Sa",
    value: "$8,450",
    change: "+23% vs mwa pase",
    icon: DollarSign,
    color: "text-secondary",
  },
  {
    title: "Evènman Planifye",
    value: "5",
    change: "2 semèn kap vini",
    icon: Calendar,
    color: "text-info",
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            );
          })}
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
