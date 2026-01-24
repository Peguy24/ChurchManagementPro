import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, DollarSign, Calendar, Building2, Eye, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface TenantStats {
  membersCount: number;
  donationsTotal: number;
  eventsCount: number;
  branchesCount: number;
}

export default function TenantDataViewer() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Redirect if not super admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["admin-tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data as Tenant[];
    },
    enabled: isAdmin,
  });

  // Fetch stats for selected tenant
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["tenant-stats", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;

      const [membersRes, donationsRes, eventsRes, branchesRes] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("donations").select("amount").eq("tenant_id", selectedTenantId),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
        supabase.from("branches").select("id", { count: "exact", head: true }).eq("tenant_id", selectedTenantId),
      ]);

      const donationsTotal = donationsRes.data?.reduce((sum, d) => sum + (Number(d.amount) || 0), 0) || 0;

      return {
        membersCount: membersRes.count || 0,
        donationsTotal,
        eventsCount: eventsRes.count || 0,
        branchesCount: branchesRes.count || 0,
      } as TenantStats;
    },
    enabled: !!selectedTenantId && isAdmin,
  });

  // Fetch members for selected tenant
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["tenant-members", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name, email, phone, status, member_type, created_at")
        .eq("tenant_id", selectedTenantId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && isAdmin,
  });

  // Fetch donations for selected tenant
  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ["tenant-donations", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from("donations")
        .select("id, amount, donation_type, donation_date, payment_method, notes")
        .eq("tenant_id", selectedTenantId)
        .order("donation_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && isAdmin,
  });

  // Fetch events for selected tenant
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["tenant-events", selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return [];
      const { data, error } = await supabase
        .from("events")
        .select("id, name, event_date, event_time, location, status")
        .eq("tenant_id", selectedTenantId)
        .order("event_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTenantId && isAdmin,
  });

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  if (roleLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Skeleton className="h-12 w-48" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Explorer les données d'une église</h1>
        <p className="text-muted-foreground">Vue en lecture seule des données des églises</p>
      </div>

      {/* Admin Warning Banner */}
      <Alert className="mb-6 border-warning/50 bg-warning/10">
        <ShieldAlert className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          <strong>Mode Administration</strong> — Vous visualisez les données en lecture seule. Les modifications ne sont pas autorisées depuis cette vue.
        </AlertDescription>
      </Alert>

      {/* Tenant Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Sélectionner une église
          </CardTitle>
          <CardDescription>
            Choisissez une église pour explorer ses données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Sélectionner une église..." />
            </SelectTrigger>
            <SelectContent>
              {tenantsLoading ? (
                <div className="p-2">Chargement...</div>
              ) : (
                tenants?.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {selectedTenantId && (
        <>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Membres</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.membersCount || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(stats?.donationsTotal || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Événements</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.eventsCount || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Branches</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.branchesCount || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Données de {selectedTenant?.name}</CardTitle>
              <CardDescription>
                Explorez les membres, donations et événements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="members">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="members">Membres</TabsTrigger>
                  <TabsTrigger value="donations">Donations</TabsTrigger>
                  <TabsTrigger value="events">Événements</TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members">
                  {membersLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : members && members.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Téléphone</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Inscrit le</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">
                                {member.first_name} {member.last_name}
                              </TableCell>
                              <TableCell>{member.email || "-"}</TableCell>
                              <TableCell>{member.phone || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{member.member_type || "membre"}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={member.status === "active" ? "default" : "secondary"}>
                                  {member.status || "actif"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {member.created_at
                                  ? format(new Date(member.created_at), "dd MMM yyyy", { locale: fr })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Aucun membre trouvé</p>
                  )}
                </TabsContent>

                {/* Donations Tab */}
                <TabsContent value="donations">
                  {donationsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : donations && donations.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Montant</TableHead>
                            <TableHead>Mode de paiement</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {donations.map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell>
                                {donation.donation_date
                                  ? format(new Date(donation.donation_date), "dd MMM yyyy", { locale: fr })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{donation.donation_type}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(
                                  Number(donation.amount)
                                )}
                              </TableCell>
                              <TableCell>{donation.payment_method}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{donation.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Aucune donation trouvée</p>
                  )}
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                  {eventsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : events && events.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Heure</TableHead>
                            <TableHead>Lieu</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.name}</TableCell>
                              <TableCell>
                                {event.event_date
                                  ? format(new Date(event.event_date), "dd MMM yyyy", { locale: fr })
                                  : "-"}
                              </TableCell>
                              <TableCell>{event.event_time || "-"}</TableCell>
                              <TableCell>{event.location || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={event.status === "completed" ? "secondary" : "default"}>
                                  {event.status || "planifié"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Aucun événement trouvé</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  );
}
