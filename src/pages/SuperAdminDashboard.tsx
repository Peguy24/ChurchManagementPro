import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, DollarSign, TrendingUp, UserCheck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      // Fetch tenants count
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

      if (tenantsError) throw tenantsError;

      // Fetch subscriptions with revenue
      const { data: subscriptions, error: subsError } = await supabase
        .from("tenant_subscriptions")
        .select("price_monthly, status");

      if (subsError) throw subsError;

      const totalRevenue = subscriptions?.reduce((sum, sub) => sum + (sub.price_monthly || 0), 0) || 0;
      const activeSubscriptions = subscriptions?.filter(sub => sub.status === "active").length || 0;
      const trialSubscriptions = subscriptions?.filter(sub => sub.status === "trial").length || 0;

      // Fetch users count (approved tenant admins)
      const { count: usersCount, error: usersError } = await supabase
        .from("tenant_user_roles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);

      if (usersError) throw usersError;

      // Fetch recent tenants
      const { data: recentTenants, error: recentError } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          contact_email,
          created_at,
          tenant_subscriptions!inner(plan, status)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      return {
        tenantsCount: tenantsCount || 0,
        totalRevenue,
        activeSubscriptions,
        trialSubscriptions,
        usersCount: usersCount || 0,
        recentTenants: recentTenants || [],
      };
    },
  });

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    loading 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    description?: string;
    loading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Super Admin</h1>
            <p className="text-muted-foreground">
              Vue d'ensemble de toutes les églises sur la plateforme
            </p>
          </div>
          <Button onClick={() => navigate("/settings/tenants")}>
            Gérer les églises
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Églises"
            value={stats?.tenantsCount || 0}
            icon={Building2}
            description="Églises enregistrées"
            loading={isLoading}
          />
          <StatCard
            title="Revenus Mensuels"
            value={formatCurrency(stats?.totalRevenue || 0)}
            icon={DollarSign}
            description="Revenus récurrents"
            loading={isLoading}
          />
          <StatCard
            title="Utilisateurs Actifs"
            value={stats?.usersCount || 0}
            icon={Users}
            description="Utilisateurs approuvés"
            loading={isLoading}
          />
          <StatCard
            title="Abonnements Actifs"
            value={stats?.activeSubscriptions || 0}
            icon={TrendingUp}
            description={`${stats?.trialSubscriptions || 0} en période d'essai`}
            loading={isLoading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Églises Récentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : stats?.recentTenants?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucune église enregistrée
                </p>
              ) : (
                <div className="space-y-3">
                  {stats?.recentTenants?.map((tenant: any) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.contact_email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tenant.tenant_subscriptions?.[0]?.status === "active"
                            ? "bg-green-100 text-green-800"
                            : tenant.tenant_subscriptions?.[0]?.status === "trial"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {tenant.tenant_subscriptions?.[0]?.plan || "basic"}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(tenant.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Actions Rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/settings/tenants")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Gérer les églises
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate("/user-management")}
              >
                <Users className="mr-2 h-4 w-4" />
                Gestion des utilisateurs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
