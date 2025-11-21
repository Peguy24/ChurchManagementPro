import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Building2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function Dashboard() {
  // Fetch members data
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, address, created_at")
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
        .select("id, first_name, last_name, address, created_at")
        .eq("status", "active")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate statistics
  const totalMembers = members?.length || 0;
  const totalBranches = branches?.length || 0;
  const totalMinistries = ministries?.length || 0;
  const paidThisWeek = 1; // Placeholder

  const stats = [
    {
      title: "Manm",
      value: totalMembers.toString(),
      link: "Wè tout Manm",
      icon: Users,
      bgColor: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      title: "Branch",
      value: totalBranches.toString(),
      link: "Plis enfòmasyon",
      icon: Building2,
      bgColor: "bg-gradient-to-br from-cyan-400 to-cyan-500",
    },
    {
      title: "Ministè",
      value: totalMinistries.toString(),
      link: "Plis enfòmasyon",
      icon: Users,
      bgColor: "bg-gradient-to-br from-red-500 to-red-600",
    },
    {
      title: "Prezans Verifye",
      value: paidThisWeek.toString(),
      link: "Plis enfò",
      icon: Calendar,
      bgColor: "bg-gradient-to-br from-orange-400 to-orange-500",
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Welcome to Main St. Cathedral</h2>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className={`${stat.bgColor} border-none shadow-lg overflow-hidden relative`}>
                <CardContent className="p-6 relative z-10">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-5xl font-bold text-white mb-2">
                        {stat.value}
                      </h3>
                      <p className="text-lg font-medium text-white/90">
                        {stat.title}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-white/20">
                      <a href="#" className="text-sm text-white/90 hover:text-white flex items-center gap-1">
                        {stat.link} <span>→</span>
                      </a>
                    </div>
                  </div>
                </CardContent>
                {/* Large background icon */}
                <div className="absolute right-4 bottom-4 opacity-20">
                  <Icon className="h-24 w-24 text-white" />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Recent Members Table */}
        <Card>
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Manm Resan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!recentMembers || recentMembers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Pa gen nouvo manm 30 dènye jou yo
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Non Manm
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Adrès
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kreye
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/members/${member.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {member.first_name} {member.last_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {member.address || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {format(new Date(member.created_at), "dd/MM/yy h:mm a")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
