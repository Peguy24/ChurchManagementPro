import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, CreditCard, BarChart3, Plus, Edit, Trash2, Eye, Settings, UserCheck, UserX, Mail, Send, Inbox } from "lucide-react";
import { TenantRequestsManager } from "@/components/TenantRequestsManager";
import { AdminInviteDialog } from "@/components/AdminInviteDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type SubscriptionPlan = "basic" | "standard" | "premium" | "enterprise";
type TenantStatus = "active" | "suspended" | "trial" | "cancelled";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  contact_email: string;
  contact_phone: string | null;
  address: string | null;
  created_at: string;
}

interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  status: TenantStatus;
  price_monthly: number;
  max_members: number;
  max_branches: number;
  max_users: number;
  max_storage_mb: number;
  features: Record<string, boolean>;
  trial_ends_at: string | null;
  current_period_end: string;
}

interface TenantWithSubscription extends Tenant {
  subscription?: TenantSubscription;
  hasAdmin?: boolean;
}

const PLAN_CONFIG: Record<SubscriptionPlan, { label: string; color: string; price: number; members: number; branches: number; users: number; storage: number }> = {
  basic: { label: "Basique", color: "bg-slate-500", price: 49, members: 100, branches: 1, users: 3, storage: 500 },
  standard: { label: "Standard", color: "bg-blue-500", price: 99, members: 500, branches: 3, users: 10, storage: 2000 },
  premium: { label: "Premium", color: "bg-purple-500", price: 199, members: 2000, branches: 10, users: 25, storage: 10000 },
  enterprise: { label: "Entreprise", color: "bg-amber-500", price: 499, members: -1, branches: -1, users: -1, storage: -1 },
};

const STATUS_CONFIG: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Actif", variant: "default" },
  trial: { label: "Essai", variant: "secondary" },
  suspended: { label: "Suspendu", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

export default function TenantManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithSubscription | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    plan: "basic" as SubscriptionPlan,
    status: "trial" as TenantStatus,
    admin_email: "",
  });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTenantForInvite, setSelectedTenantForInvite] = useState<TenantWithSubscription | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) throw tenantsError;

      const { data: subscriptionsData, error: subsError } = await supabase
        .from("tenant_subscriptions")
        .select("*");

      if (subsError) throw subsError;

      // Fetch admin roles for each tenant
      const { data: adminRolesData, error: rolesError } = await supabase
        .from("tenant_user_roles")
        .select("tenant_id")
        .eq("role", "admin")
        .eq("is_approved", true);

      if (rolesError) throw rolesError;

      const tenantsWithAdmins = new Set(adminRolesData?.map(r => r.tenant_id) || []);

      const tenantsWithSubs: TenantWithSubscription[] = (tenantsData || []).map((tenant) => ({
        ...tenant,
        subscription: subscriptionsData?.find((s) => s.tenant_id === tenant.id) as TenantSubscription | undefined,
        hasAdmin: tenantsWithAdmins.has(tenant.id),
      }));

      return tenantsWithSubs;
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const planConfig = PLAN_CONFIG[data.plan];
      
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .insert({
          name: data.name,
          slug: data.slug.toLowerCase().replace(/\s+/g, "-"),
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          address: data.address || null,
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      const { error: subError } = await supabase
        .from("tenant_subscriptions")
        .insert({
          tenant_id: tenant.id,
          plan: data.plan,
          status: data.status,
          price_monthly: planConfig.price,
          max_members: planConfig.members,
          max_branches: planConfig.branches,
          max_users: planConfig.users,
          max_storage_mb: planConfig.storage,
          trial_ends_at: data.status === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null,
        });

      if (subError) throw subError;

      // Send admin invite if email provided
      if (data.admin_email) {
        try {
          const { error: inviteError } = await supabase.functions.invoke('send-admin-invite', {
            body: {
              email: data.admin_email,
              tenantId: tenant.id,
              tenantName: tenant.name,
              tenantSlug: tenant.slug,
            },
          });
          if (inviteError) {
            console.error('Failed to send admin invite:', inviteError);
            toast.error("Invitation envoyée mais erreur lors de l'envoi de l'email");
          } else {
            toast.success(`Invitation envoyée à ${data.admin_email}`);
          }
        } catch (inviteErr) {
          console.error('Failed to send admin invite:', inviteErr);
        }
      }

      return tenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Client créé avec succès");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });

  const openInviteDialog = (tenant: TenantWithSubscription) => {
    setSelectedTenantForInvite(tenant);
    setInviteDialogOpen(true);
  };

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const planConfig = PLAN_CONFIG[data.plan];

      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          name: data.name,
          slug: data.slug.toLowerCase().replace(/\s+/g, "-"),
          contact_email: data.contact_email,
          contact_phone: data.contact_phone || null,
          address: data.address || null,
        })
        .eq("id", id);

      if (tenantError) throw tenantError;

      const { error: subError } = await supabase
        .from("tenant_subscriptions")
        .update({
          plan: data.plan,
          status: data.status,
          price_monthly: planConfig.price,
          max_members: planConfig.members,
          max_branches: planConfig.branches,
          max_users: planConfig.users,
          max_storage_mb: planConfig.storage,
        })
        .eq("tenant_id", id);

      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Client mis à jour avec succès");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Client supprimé avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      plan: "basic",
      status: "trial",
      admin_email: "",
    });
    setEditingTenant(null);
  };

  const handleEdit = (tenant: TenantWithSubscription) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone || "",
      address: tenant.address || "",
      plan: tenant.subscription?.plan || "basic",
      status: tenant.subscription?.status || "trial",
      admin_email: "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTenant) {
      updateTenantMutation.mutate({ id: editingTenant.id, data: formData });
    } else {
      createTenantMutation.mutate(formData);
    }
  };

  const totalRevenue = tenants?.reduce((sum, t) => {
    if (t.subscription?.status === "active") {
      return sum + (t.subscription.price_monthly || 0);
    }
    return sum;
  }, 0) || 0;

  const activeCount = tenants?.filter((t) => t.subscription?.status === "active").length || 0;
  const trialCount = tenants?.filter((t) => t.subscription?.status === "trial").length || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion Multi-Tenant</h1>
            <p className="text-muted-foreground">Gérez vos clients églises et leurs abonnements</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTenant ? "Modifier le client" : "Ajouter un nouveau client"}</DialogTitle>
                <DialogDescription>
                  {editingTenant ? "Modifiez les informations du client" : "Créez une nouvelle église cliente avec son abonnement"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'église</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Identifiant (slug)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email de contact</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Téléphone</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">Plan d'abonnement</Label>
                    <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v as SubscriptionPlan })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label} - ${config.price}/mois
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as TenantStatus })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {!editingTenant && (
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="admin_email">
                        <Mail className="h-4 w-4 inline mr-2" />
                        Email de l'administrateur (optionnel)
                      </Label>
                      <Input
                        id="admin_email"
                        type="email"
                        placeholder="admin@eglise.com"
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Un email d'invitation sera envoyé à cette adresse pour créer le compte admin de l'église.
                      </p>
                    </div>
                  )}
                </div>

                {/* Plan details preview */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Membres max</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].members === -1 ? "Illimité" : PLAN_CONFIG[formData.plan].members}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Succursales max</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].branches === -1 ? "Illimité" : PLAN_CONFIG[formData.plan].branches}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Utilisateurs max</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].users === -1 ? "Illimité" : PLAN_CONFIG[formData.plan].users}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Stockage</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].storage === -1 ? "Illimité" : `${PLAN_CONFIG[formData.plan].storage} MB`}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={createTenantMutation.isPending || updateTenantMutation.isPending}>
                    {editingTenant ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants?.length || 0}</div>
              <p className="text-xs text-muted-foreground">églises enregistrées</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients Actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
              <p className="text-xs text-muted-foreground">{trialCount} en période d'essai</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Mensuels</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue}</div>
              <p className="text-xs text-muted-foreground">MRR (Monthly Recurring Revenue)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus Annuels</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue * 12}</div>
              <p className="text-xs text-muted-foreground">ARR (Annual Recurring Revenue)</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Tenants and Requests */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants">
              <Building2 className="h-4 w-4 mr-2" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Inbox className="h-4 w-4 mr-2" />
              Demandes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            {/* Tenants Table */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des Clients</CardTitle>
                <CardDescription>Gérez vos églises clientes et leurs abonnements</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : tenants && tenants.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Église</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Prix/mois</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{tenant.contact_email}</p>
                              {tenant.contact_phone && (
                                <p className="text-sm text-muted-foreground">{tenant.contact_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant.hasAdmin ? (
                              <Badge variant="default" className="gap-1">
                                <UserCheck className="h-3 w-3" />
                                Configuré
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                  <UserX className="h-3 w-3" />
                                  Non configuré
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() => openInviteDialog(tenant)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Inviter
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {tenant.subscription ? (
                              <Badge className={PLAN_CONFIG[tenant.subscription.plan]?.color}>
                                {PLAN_CONFIG[tenant.subscription.plan]?.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Non configuré</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {tenant.subscription ? (
                              <Badge variant={STATUS_CONFIG[tenant.subscription.status]?.variant}>
                                {STATUS_CONFIG[tenant.subscription.status]?.label}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {tenant.subscription ? `$${tenant.subscription.price_monthly}` : "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(tenant.created_at), "dd MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(tenant)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
                                    deleteTenantMutation.mutate(tenant.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun client enregistré</p>
                    <p className="text-sm">Cliquez sur "Nouveau Client" pour ajouter votre première église</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <TenantRequestsManager />
          </TabsContent>
        </Tabs>

        <AdminInviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          tenant={selectedTenantForInvite}
        />
      </div>
    </Layout>
  );
}
