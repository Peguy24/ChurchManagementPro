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
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Calendar, Building2, Eye, ShieldAlert, Download } from "lucide-react";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t, language } = useLanguage();
  const dateLocale = language === "fr" ? fr : language === "ht" ? fr : enUS;

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

  const handleExportMembers = () => {
    if (!members || members.length === 0) {
      toast.error(t("superAdmin.noMembersToExport"));
      return;
    }
    const columns = [
      { key: "first_name", header: t("members.firstName") },
      { key: "last_name", header: t("members.lastName") },
      { key: "email", header: t("superAdmin.email") },
      { key: "phone", header: t("superAdmin.phone") },
      { key: "member_type", header: t("superAdmin.type") },
      { key: "status", header: t("superAdmin.status") },
      { key: "created_at", header: t("superAdmin.registeredOn"), formatter: (v: string) => formatDateForCsv(v) },
    ];
    exportToCsv(members, columns, `members_${selectedTenant?.slug || "export"}_${new Date().toISOString().split('T')[0]}`);
    toast.success(t("superAdmin.membersExported"));
  };

  const handleExportDonations = () => {
    if (!donations || donations.length === 0) {
      toast.error(t("superAdmin.noDonationsToExport"));
      return;
    }
    const columns = [
      { key: "donation_date", header: t("superAdmin.date"), formatter: (v: string) => formatDateForCsv(v) },
      { key: "donation_type", header: t("superAdmin.type") },
      { key: "amount", header: t("superAdmin.amount"), formatter: (v: number) => formatCurrencyForCsv(v) },
      { key: "payment_method", header: t("superAdmin.payment") },
      { key: "notes", header: t("superAdmin.notes") },
    ];
    exportToCsv(donations, columns, `donations_${selectedTenant?.slug || "export"}_${new Date().toISOString().split('T')[0]}`);
    toast.success(t("superAdmin.donationsExported"));
  };

  const handleExportEvents = () => {
    if (!events || events.length === 0) {
      toast.error(t("superAdmin.noEventsToExport"));
      return;
    }
    const columns = [
      { key: "name", header: t("superAdmin.name") },
      { key: "event_date", header: t("superAdmin.date"), formatter: (v: string) => formatDateForCsv(v) },
      { key: "event_time", header: t("superAdmin.time") },
      { key: "location", header: t("superAdmin.location") },
      { key: "status", header: t("superAdmin.status") },
    ];
    exportToCsv(events, columns, `events_${selectedTenant?.slug || "export"}_${new Date().toISOString().split('T')[0]}`);
    toast.success(t("superAdmin.eventsExported"));
  };

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
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("superAdmin.dataViewerTitle")}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{t("superAdmin.dataViewerSubtitle")}</p>
      </div>

      {/* Admin Warning Banner */}
      <Alert className="mb-4 md:mb-6 border-warning/50 bg-warning/10">
        <ShieldAlert className="h-4 w-4 text-warning flex-shrink-0" />
        <AlertDescription className="text-warning text-sm">
          <strong>{t("superAdmin.adminMode")}</strong> — {t("superAdmin.readOnlyView")}
        </AlertDescription>
      </Alert>

      {/* Tenant Selector */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Eye className="h-4 w-4 md:h-5 md:w-5" />
            {t("superAdmin.selectChurch")}
          </CardTitle>
          <CardDescription className="text-sm">
            {t("superAdmin.chooseChurch")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="w-full md:max-w-md">
              <SelectValue placeholder={t("superAdmin.selectChurchPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {tenantsLoading ? (
                <div className="p-2">{t("common.loading")}</div>
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
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 md:mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.membersTab")}</CardTitle>
                <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-12 md:w-16" />
                ) : (
                  <div className="text-xl md:text-2xl font-bold">{stats?.membersCount || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.donationsTab")}</CardTitle>
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-16 md:w-24" />
                ) : (
                  <div className="text-lg md:text-2xl font-bold">
                    {new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(stats?.donationsTotal || 0)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.eventsTab")}</CardTitle>
                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-12 md:w-16" />
                ) : (
                  <div className="text-xl md:text-2xl font-bold">{stats?.eventsCount || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.branchesCount")}</CardTitle>
                <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {statsLoading ? (
                  <Skeleton className="h-6 md:h-8 w-12 md:w-16" />
                ) : (
                  <div className="text-xl md:text-2xl font-bold">{stats?.branchesCount || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Data Tabs */}
          <Card>
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="text-lg md:text-xl">{t("superAdmin.dataOf")} {selectedTenant?.name}</CardTitle>
              <CardDescription className="text-sm">
                {t("superAdmin.exploreData")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
              <Tabs defaultValue="members">
                <TabsList className="grid w-full grid-cols-3 mb-4 h-auto">
                  <TabsTrigger value="members" className="text-xs md:text-sm py-2">{t("superAdmin.membersTab")}</TabsTrigger>
                  <TabsTrigger value="donations" className="text-xs md:text-sm py-2">{t("superAdmin.donationsTab")}</TabsTrigger>
                  <TabsTrigger value="events" className="text-xs md:text-sm py-2">{t("superAdmin.eventsTab")}</TabsTrigger>
                </TabsList>

                {/* Members Tab */}
                <TabsContent value="members">
                  <div className="flex justify-end mb-3">
                    <Button variant="outline" size="sm" onClick={handleExportMembers} disabled={!members || members.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("superAdmin.exportCsv")}
                    </Button>
                  </div>
                  {membersLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : members && members.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.name")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("superAdmin.email")}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t("superAdmin.phone")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.type")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.status")}</TableHead>
                            <TableHead className="hidden sm:table-cell whitespace-nowrap">{t("superAdmin.registeredOn")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {member.first_name} {member.last_name}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{member.email || "-"}</TableCell>
                              <TableCell className="hidden lg:table-cell">{member.phone || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{member.member_type || t("members.roles.member")}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs">
                                  {member.status === "active" ? t("common.active") : member.status || t("common.active")}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell whitespace-nowrap">
                                {member.created_at
                                  ? format(new Date(member.created_at), "dd MMM yyyy", { locale: dateLocale })
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">{t("superAdmin.noMembersFound")}</p>
                  )}
                </TabsContent>

                {/* Donations Tab */}
                <TabsContent value="donations">
                  <div className="flex justify-end mb-3">
                    <Button variant="outline" size="sm" onClick={handleExportDonations} disabled={!donations || donations.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("superAdmin.exportCsv")}
                    </Button>
                  </div>
                  {donationsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : donations && donations.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.date")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.type")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.amount")}</TableHead>
                            <TableHead className="hidden sm:table-cell">{t("superAdmin.payment")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("superAdmin.notes")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {donations.map((donation) => (
                            <TableRow key={donation.id}>
                              <TableCell className="whitespace-nowrap">
                                {donation.donation_date
                                  ? format(new Date(donation.donation_date), "dd MMM", { locale: dateLocale })
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{donation.donation_type}</Badge>
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">
                                {new Intl.NumberFormat(language === "en" ? "en-US" : "fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
                                  Number(donation.amount)
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{donation.payment_method}</TableCell>
                              <TableCell className="hidden md:table-cell max-w-[150px] truncate">{donation.notes || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">{t("superAdmin.noDonationsFound")}</p>
                  )}
                </TabsContent>

                {/* Events Tab */}
                <TabsContent value="events">
                  <div className="flex justify-end mb-3">
                    <Button variant="outline" size="sm" onClick={handleExportEvents} disabled={!events || events.length === 0}>
                      <Download className="h-4 w-4 mr-2" />
                      {t("superAdmin.exportCsv")}
                    </Button>
                  </div>
                  {eventsLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : events && events.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.name")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.date")}</TableHead>
                            <TableHead className="hidden sm:table-cell">{t("superAdmin.time")}</TableHead>
                            <TableHead className="hidden md:table-cell">{t("superAdmin.location")}</TableHead>
                            <TableHead className="whitespace-nowrap">{t("superAdmin.status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {events.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium max-w-[150px] truncate">{event.name}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {event.event_date
                                  ? format(new Date(event.event_date), "dd MMM", { locale: dateLocale })
                                  : "-"}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{event.event_time || "-"}</TableCell>
                              <TableCell className="hidden md:table-cell max-w-[120px] truncate">{event.location || "-"}</TableCell>
                              <TableCell>
                                <Badge variant={event.status === "completed" ? "secondary" : "default"} className="text-xs">
                                  {event.status === "completed" ? t("events.completed") : event.status === "planned" ? t("events.planned") : event.status || t("events.planned")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">{t("superAdmin.noEventsFound")}</p>
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
