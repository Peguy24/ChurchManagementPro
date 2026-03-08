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
import { Building2, Users, CreditCard, BarChart3, Plus, Edit, Trash2, Eye, Settings, UserCheck, UserX, Mail, Send, Inbox, Clock, Calendar, History, AlertTriangle, Power, PowerOff, Crown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { differenceInDays, isPast } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { addDays, addMonths, addYears } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TenantRequestsManager } from "@/components/TenantRequestsManager";
import { AdminInviteDialog } from "@/components/AdminInviteDialog";
import { TenantAdminManager } from "@/components/TenantAdminManager";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { useLanguage } from "@/contexts/LanguageContext";
import { logPlatformActivity } from "@/lib/activityLogger";

type SubscriptionPlan = "free" | "basic" | "standard" | "premium" | "enterprise";
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

interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  tenant_name?: string;
}

type TrialDuration = "14_days" | "1_month" | "3_months" | "6_months" | "1_year" | "custom";

const calculateTrialEndDate = (duration: TrialDuration, customDate?: Date): Date => {
  const now = new Date();
  switch (duration) {
    case "14_days": return addDays(now, 14);
    case "1_month": return addMonths(now, 1);
    case "3_months": return addMonths(now, 3);
    case "6_months": return addMonths(now, 6);
    case "1_year": return addYears(now, 1);
    case "custom": return customDate || addDays(now, 14);
    default: return addDays(now, 14);
  }
};

export default function TenantManagement() {
  const queryClient = useQueryClient();
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? fr : language === 'ht' ? fr : enUS;

  const PLAN_CONFIG: Record<SubscriptionPlan, { label: string; color: string; price: number; members: number; branches: number; users: number; storage: number }> = {
    free: { label: t("superAdmin.free"), color: "bg-green-600", price: 0, members: 100, branches: 1, users: 3, storage: 200 },
    basic: { label: t("superAdmin.planBasic"), color: "bg-slate-500", price: 49, members: 200, branches: 1, users: 5, storage: 500 },
    standard: { label: t("superAdmin.planStandard"), color: "bg-blue-500", price: 99, members: 1000, branches: 3, users: 15, storage: 2000 },
    premium: { label: t("superAdmin.planPremium"), color: "bg-purple-500", price: 199, members: -1, branches: -1, users: -1, storage: -1 },
    enterprise: { label: t("superAdmin.planEnterprise"), color: "bg-amber-500", price: 499, members: -1, branches: -1, users: -1, storage: -1 },
  };

  const STATUS_CONFIG: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: t("superAdmin.statusActive"), variant: "default" },
    trial: { label: t("superAdmin.statusTrial"), variant: "secondary" },
    suspended: { label: t("superAdmin.statusSuspended"), variant: "destructive" },
    cancelled: { label: t("superAdmin.statusCancelled"), variant: "outline" },
  };

  const TRIAL_DURATION_OPTIONS: { value: TrialDuration; label: string }[] = [
    { value: "14_days", label: t("superAdmin.days14") },
    { value: "1_month", label: t("superAdmin.month1") },
    { value: "3_months", label: t("superAdmin.months3") },
    { value: "6_months", label: t("superAdmin.months6") },
    { value: "1_year", label: t("superAdmin.year1") },
    { value: "custom", label: t("superAdmin.customDate") },
  ];

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
    trial_duration: "14_days" as TrialDuration,
    custom_trial_date: undefined as Date | undefined,
  });
  const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
  const [selectedTenantForExtend, setSelectedTenantForExtend] = useState<TenantWithSubscription | null>(null);
  const [extendTrialDuration, setExtendTrialDuration] = useState<TrialDuration>("1_month");
  const [extendCustomDate, setExtendCustomDate] = useState<Date | undefined>(undefined);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTenantForInvite, setSelectedTenantForInvite] = useState<TenantWithSubscription | null>(null);
  const [planActivationDialogOpen, setPlanActivationDialogOpen] = useState(false);
  const [selectedTenantForPlan, setSelectedTenantForPlan] = useState<TenantWithSubscription | null>(null);
  const [selectedPlanForActivation, setSelectedPlanForActivation] = useState<SubscriptionPlan>("standard");
  const [adminManagerOpen, setAdminManagerOpen] = useState(false);
  const [selectedTenantForAdmin, setSelectedTenantForAdmin] = useState<TenantWithSubscription | null>(null);

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

  const { data: auditLogs, isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ["subscription-audit-logs"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("subscription_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("id, name");

      const tenantMap = new Map(tenantsData?.map(t => [t.id, t.name]) || []);

      return (logs || []).map(log => ({
        ...log,
        tenant_name: tenantMap.get(log.tenant_id) || t("superAdmin.deletedTenant"),
      })) as AuditLog[];
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
          plan: data.plan as any,
          status: data.status,
          price_monthly: planConfig.price,
          max_members: planConfig.members,
          max_branches: planConfig.branches,
          max_users: planConfig.users,
          max_storage_mb: planConfig.storage,
          trial_ends_at: data.status === "trial" 
            ? calculateTrialEndDate(data.trial_duration, data.custom_trial_date).toISOString() 
            : null,
        });

      if (subError) throw subError;

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
            toast.error(t("superAdmin.inviteError"));
          } else {
            toast.success(`${t("superAdmin.inviteSent")} ${data.admin_email}`);
          }
        } catch (inviteErr) {
          console.error('Failed to send admin invite:', inviteErr);
        }
      }

      return tenant;
    },
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("superAdmin.churchCreated"));
      logPlatformActivity({
        eventType: "tenant_created",
        eventCategory: "tenant",
        description: `Église créée: ${tenant.name}`,
        tenantId: tenant.id,
        metadata: { name: tenant.name, slug: tenant.slug },
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(t("superAdmin.createError") + ": " + error.message);
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
          plan: data.plan as any,
          status: data.status,
          price_monthly: planConfig.price,
          max_members: planConfig.members,
          max_branches: planConfig.branches,
          max_users: planConfig.users,
          max_storage_mb: planConfig.storage,
          trial_ends_at: data.status === "trial" 
            ? calculateTrialEndDate(data.trial_duration, data.custom_trial_date).toISOString() 
            : null,
        })
        .eq("tenant_id", id);

      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("superAdmin.churchUpdated"));
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(t("superAdmin.updateError") + ": " + error.message);
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('delete-tenant', {
        body: { tenant_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success(t("superAdmin.churchDeleted"));
      logPlatformActivity({
        eventType: "tenant_deleted",
        eventCategory: "tenant",
        description: `Église supprimée (ID: ${id})`,
        metadata: { tenant_id: id },
      });
    },
    onError: (error) => {
      toast.error(t("superAdmin.deleteError") + ": " + error.message);
    },
  });

  const extendTrialMutation = useMutation({
    mutationFn: async ({ tenantId, tenantName, oldTrialEnd, duration, customDate }: { 
      tenantId: string; 
      tenantName: string;
      oldTrialEnd: string | null;
      duration: TrialDuration; 
      customDate?: Date 
    }) => {
      const newTrialEnd = calculateTrialEndDate(duration, customDate);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("tenant_subscriptions")
        .update({
          status: "trial",
          trial_ends_at: newTrialEnd.toISOString(),
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const { error: auditError } = await supabase
        .from("subscription_audit_logs")
        .insert({
          tenant_id: tenantId,
          user_id: user?.id,
          user_email: user?.email,
          action_type: "trial_extended",
          old_values: { trial_ends_at: oldTrialEnd },
          new_values: { 
            trial_ends_at: newTrialEnd.toISOString(),
            duration: duration,
          },
          notes: `${t("superAdmin.trialExtendedAction")} - ${TRIAL_DURATION_OPTIONS.find(o => o.value === duration)?.label || duration} - ${tenantName}`,
        });

      if (auditError) {
        console.error("Failed to log audit:", auditError);
      }

      return newTrialEnd;
    },
    onSuccess: (newTrialEnd, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-audit-logs"] });
      toast.success(`${t("superAdmin.trialExtended")} ${format(newTrialEnd, "dd MMM yyyy", { locale: dateLocale })}`);
      logPlatformActivity({
        eventType: "trial_extended",
        eventCategory: "subscription",
        description: `Essai prolongé pour ${variables.tenantName}`,
        tenantId: variables.tenantId,
        metadata: { new_trial_end: newTrialEnd.toISOString(), duration: variables.duration },
      });
      setExtendTrialDialogOpen(false);
      setSelectedTenantForExtend(null);
    },
    onError: (error) => {
      toast.error(t("superAdmin.extendError") + ": " + error.message);
    },
  });

  const openExtendTrialDialog = (tenant: TenantWithSubscription) => {
    setSelectedTenantForExtend(tenant);
    setExtendTrialDuration("1_month");
    setExtendCustomDate(undefined);
    setExtendTrialDialogOpen(true);
  };

  const handleExtendTrial = () => {
    if (selectedTenantForExtend) {
      extendTrialMutation.mutate({
        tenantId: selectedTenantForExtend.id,
        tenantName: selectedTenantForExtend.name,
        oldTrialEnd: selectedTenantForExtend.subscription?.trial_ends_at || null,
        duration: extendTrialDuration,
        customDate: extendCustomDate,
      });
    }
  };

  const activatePlanMutation = useMutation({
    mutationFn: async ({ 
      tenantId, tenantName, plan, activate, oldStatus, oldPlan,
    }: { 
      tenantId: string; tenantName: string; plan: SubscriptionPlan; activate: boolean;
      oldStatus: TenantStatus | undefined; oldPlan: SubscriptionPlan | undefined;
    }) => {
      const planConfig = PLAN_CONFIG[plan];
      const { data: { user } } = await supabase.auth.getUser();
      const newStatus = activate ? "active" : "suspended";
      
      const { error } = await supabase
        .from("tenant_subscriptions")
        .update({
          plan: plan as any,
          status: newStatus,
          price_monthly: planConfig.price,
          max_members: planConfig.members,
          max_branches: planConfig.branches,
          max_users: planConfig.users,
          max_storage_mb: planConfig.storage,
          trial_ends_at: null,
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      const { error: auditError } = await supabase
        .from("subscription_audit_logs")
        .insert({
          tenant_id: tenantId,
          user_id: user?.id,
          user_email: user?.email,
          action_type: activate ? "plan_activated" : "plan_deactivated",
          old_values: { status: oldStatus, plan: oldPlan },
          new_values: { status: newStatus, plan: plan, manual_activation: true },
          notes: activate 
            ? `${t("superAdmin.planActivated")} - ${PLAN_CONFIG[plan].label} - ${tenantName}`
            : `${t("superAdmin.planDeactivated")} - ${tenantName}`,
        });

      if (auditError) {
        console.error("Failed to log audit:", auditError);
      }

      return { activate, plan };
    },
    onSuccess: ({ activate, plan }, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-audit-logs"] });
      toast.success(
        activate 
          ? t("superAdmin.planActivatedSuccess").replace("{plan}", PLAN_CONFIG[plan].label)
          : t("superAdmin.planDeactivatedSuccess")
      );
      logPlatformActivity({
        eventType: activate ? "plan_activated" : "plan_deactivated",
        eventCategory: "subscription",
        description: activate 
          ? `Plan ${PLAN_CONFIG[plan].label} activé pour ${variables.tenantName}`
          : `Plan désactivé pour ${variables.tenantName}`,
        tenantId: variables.tenantId,
        metadata: { plan, activate, old_plan: variables.oldPlan, old_status: variables.oldStatus },
      });
      setPlanActivationDialogOpen(false);
      setSelectedTenantForPlan(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const openPlanActivationDialog = (tenant: TenantWithSubscription) => {
    setSelectedTenantForPlan(tenant);
    setSelectedPlanForActivation(tenant.subscription?.plan || "standard");
    setPlanActivationDialogOpen(true);
  };

  const handleActivatePlan = (activate: boolean) => {
    if (selectedTenantForPlan) {
      activatePlanMutation.mutate({
        tenantId: selectedTenantForPlan.id,
        tenantName: selectedTenantForPlan.name,
        plan: selectedPlanForActivation,
        activate,
        oldStatus: selectedTenantForPlan.subscription?.status,
        oldPlan: selectedTenantForPlan.subscription?.plan,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "", slug: "", contact_email: "", contact_phone: "", address: "",
      plan: "basic", status: "trial", admin_email: "",
      trial_duration: "14_days", custom_trial_date: undefined,
    });
    setEditingTenant(null);
  };

  const handleEdit = (tenant: TenantWithSubscription) => {
    setEditingTenant(tenant);
    const existingTrialEnd = tenant.subscription?.trial_ends_at 
      ? new Date(tenant.subscription.trial_ends_at) : undefined;
    
    setFormData({
      name: tenant.name, slug: tenant.slug,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone || "",
      address: tenant.address || "",
      plan: tenant.subscription?.plan || "basic",
      status: tenant.subscription?.status || "trial",
      admin_email: "",
      trial_duration: existingTrialEnd ? "custom" : "14_days",
      custom_trial_date: existingTrialEnd,
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
    if (t.subscription?.status === "active") return sum + (t.subscription.price_monthly || 0);
    return sum;
  }, 0) || 0;

  const activeCount = tenants?.filter((t) => t.subscription?.status === "active").length || 0;
  const trialCount = tenants?.filter((t) => t.subscription?.status === "trial").length || 0;

  const expiringTrials = tenants?.filter((t) => {
    if (t.subscription?.status !== "trial" || !t.subscription?.trial_ends_at) return false;
    const daysLeft = differenceInDays(new Date(t.subscription.trial_ends_at), new Date());
    return daysLeft >= 0 && daysLeft <= 7;
  }) || [];

  const expiredTrials = tenants?.filter((t) => {
    if (t.subscription?.status !== "trial" || !t.subscription?.trial_ends_at) return false;
    return isPast(new Date(t.subscription.trial_ends_at));
  }) || [];

  const getAuditActionLabel = (actionType: string) => {
    switch (actionType) {
      case "trial_extended": return t("superAdmin.trialExtension");
      case "subscription_updated": return t("superAdmin.subscriptionUpdate");
      case "tenant_created": return t("superAdmin.tenantCreation");
      case "plan_activated": return t("superAdmin.planActivated");
      case "plan_deactivated": return t("superAdmin.planDeactivated");
      default: return actionType;
    }
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("superAdmin.tenantManagement")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t("superAdmin.tenantManagementDesc")}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t("superAdmin.newClient")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTenant ? t("superAdmin.editClient") : t("superAdmin.addNewClient")}</DialogTitle>
                <DialogDescription>
                  {editingTenant ? t("superAdmin.editClientInfo") : t("superAdmin.createClientDesc")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("superAdmin.churchName")}</Label>
                    <Input id="name" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                      required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">{t("superAdmin.identifier")}</Label>
                    <Input id="slug" value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">{t("superAdmin.contactEmail")}</Label>
                    <Input id="contact_email" type="email" value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">{t("superAdmin.contactPhone")}</Label>
                    <Input id="contact_phone" value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-2">
                    <Label htmlFor="address">{t("superAdmin.address")}</Label>
                    <Input id="address" value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plan">{t("superAdmin.subscriptionPlan")}</Label>
                    <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v as SubscriptionPlan })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label} {config.price > 0 ? `- $${config.price}${t("superAdmin.perMonth")}` : `- ${t("superAdmin.free")}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">{t("superAdmin.status")}</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as TenantStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.status === "trial" && (
                     <div className="col-span-1 sm:col-span-2 space-y-2">
                      <Label htmlFor="trial_duration">
                        <Clock className="h-4 w-4 inline mr-2" />
                        {t("superAdmin.trialDurationLabel")}
                      </Label>
                      <Select value={formData.trial_duration} onValueChange={(v) => setFormData({ ...formData, trial_duration: v as TrialDuration })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TRIAL_DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {formData.trial_duration === "custom" && (
                        <div className="pt-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal">
                                <Calendar className="mr-2 h-4 w-4" />
                                {formData.custom_trial_date 
                                  ? format(formData.custom_trial_date, "dd MMM yyyy", { locale: dateLocale })
                                  : t("superAdmin.selectDate")}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent mode="single" selected={formData.custom_trial_date}
                                onSelect={(date) => setFormData({ ...formData, custom_trial_date: date })}
                                disabled={(date) => date < new Date()} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      
                      {formData.trial_duration !== "custom" && (
                        <p className="text-xs text-muted-foreground">
                          {t("superAdmin.trialEndsOn")} {format(calculateTrialEndDate(formData.trial_duration), "dd MMM yyyy", { locale: dateLocale })}
                        </p>
                      )}
                    </div>
                  )}
                  {!editingTenant && (
                    <div className="col-span-1 sm:col-span-2 space-y-2">
                      <Label htmlFor="admin_email">
                        <Mail className="h-4 w-4 inline mr-2" />
                        {t("superAdmin.adminEmailOptional")}
                      </Label>
                      <Input id="admin_email" type="email" placeholder={t("superAdmin.adminEmailPlaceholder")}
                        value={formData.admin_email}
                        onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })} />
                      <p className="text-xs text-muted-foreground">{t("superAdmin.adminEmailHint")}</p>
                    </div>
                  )}
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">{t("superAdmin.maxMembers")}</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].members === -1 ? t("superAdmin.unlimited") : PLAN_CONFIG[formData.plan].members}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("superAdmin.maxBranches")}</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].branches === -1 ? t("superAdmin.unlimited") : PLAN_CONFIG[formData.plan].branches}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("superAdmin.maxUsers")}</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].users === -1 ? t("superAdmin.unlimited") : PLAN_CONFIG[formData.plan].users}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("superAdmin.storage")}</p>
                        <p className="font-semibold">{PLAN_CONFIG[formData.plan].storage === -1 ? t("superAdmin.unlimited") : `${PLAN_CONFIG[formData.plan].storage} MB`}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    {t("superAdmin.cancel")}
                  </Button>
                  <Button type="submit" disabled={createTenantMutation.isPending || updateTenantMutation.isPending}>
                    {editingTenant ? t("superAdmin.update") : t("superAdmin.create")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.totalClients")}</CardTitle>
              <Building2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{tenants?.length || 0}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t("superAdmin.registeredChurchesLabel")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">{t("superAdmin.activeClients")}</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">{activeCount}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{trialCount} {t("superAdmin.inTrialPeriod")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">MRR</CardTitle>
              <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">${totalRevenue}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t("superAdmin.monthlyRevenueLabel")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">ARR</CardTitle>
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-2xl font-bold">${totalRevenue * 12}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t("superAdmin.annualRevenueLabel")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Trials Alert */}
        {(expiringTrials.length > 0 || expiredTrials.length > 0) && (
          <div className="space-y-3">
            {expiredTrials.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("superAdmin.expiredTrials")} ({expiredTrials.length})</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    {expiredTrials.map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between">
                        <span className="font-medium">{tenant.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {t("superAdmin.expiredOn")} {format(new Date(tenant.subscription!.trial_ends_at!), "dd MMM yyyy", { locale: dateLocale })}
                          </span>
                          <Button variant="outline" size="sm" className="h-7" onClick={() => openExtendTrialDialog(tenant)}>
                            <Clock className="h-3 w-3 mr-1" />
                            {t("superAdmin.extend")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {expiringTrials.length > 0 && (
              <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200 [&>svg]:text-orange-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("superAdmin.expiringSoon")} ({expiringTrials.length})</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    {expiringTrials.map((tenant) => {
                      const daysLeft = differenceInDays(new Date(tenant.subscription!.trial_ends_at!), new Date());
                      return (
                        <div key={tenant.id} className="flex items-center justify-between">
                          <span className="font-medium">{tenant.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">
                              {daysLeft === 0 ? t("superAdmin.expiresToday") : `${daysLeft} ${daysLeft > 1 ? t("superAdmin.daysRemaining") : t("superAdmin.dayRemaining")}`}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({format(new Date(tenant.subscription!.trial_ends_at!), "dd MMM", { locale: dateLocale })})
                            </span>
                            <Button variant="outline" size="sm" className="h-7" onClick={() => openExtendTrialDialog(tenant)}>
                              <Clock className="h-3 w-3 mr-1" />
                              {t("superAdmin.extend")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="tenants" className="text-xs sm:text-sm py-2">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t("superAdmin.clientsTab")}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs sm:text-sm py-2">
              <Inbox className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t("superAdmin.requestsTab")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm py-2">
              <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t("superAdmin.historyTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-lg md:text-xl">{t("superAdmin.clientList")}</CardTitle>
                <CardDescription className="text-sm">{t("superAdmin.manageClientsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : tenants && tenants.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">{t("superAdmin.church")}</TableHead>
                          <TableHead className="hidden lg:table-cell">{t("superAdmin.contact")}</TableHead>
                          <TableHead className="hidden md:table-cell">{t("superAdmin.admin")}</TableHead>
                          <TableHead className="whitespace-nowrap">{t("superAdmin.plan")}</TableHead>
                          <TableHead className="whitespace-nowrap">{t("superAdmin.status")}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t("superAdmin.price")}</TableHead>
                          <TableHead className="hidden lg:table-cell">{t("superAdmin.createdOn")}</TableHead>
                          <TableHead className="text-right">{t("superAdmin.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div>
                              <p className="text-sm">{tenant.contact_email}</p>
                              {tenant.contact_phone && (
                                <p className="text-xs text-muted-foreground">{tenant.contact_phone}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {tenant.hasAdmin ? (
                              <Button variant="ghost" size="sm"
                                className="gap-1 text-xs p-0 h-auto hover:bg-transparent"
                                onClick={() => { setSelectedTenantForAdmin(tenant); setAdminManagerOpen(true); }}>
                                <Badge variant="default" className="gap-1 text-xs cursor-pointer hover:opacity-80">
                                  <UserCheck className="h-3 w-3" />
                                  <span className="hidden lg:inline">{t("superAdmin.viewAdmins")}</span>
                                  <span className="lg:hidden">{t("superAdmin.view")}</span>
                                </Badge>
                              </Button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="gap-1 text-xs text-warning border-warning/50">
                                  <UserX className="h-3 w-3" />
                                </Badge>
                                <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => openInviteDialog(tenant)}>
                                  <Send className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {tenant.subscription ? (
                              <Badge className={PLAN_CONFIG[tenant.subscription.plan]?.color + " text-xs"}>
                                {PLAN_CONFIG[tenant.subscription.plan]?.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">N/A</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {tenant.subscription ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge variant={STATUS_CONFIG[tenant.subscription.status]?.variant} className="text-xs">
                                  {STATUS_CONFIG[tenant.subscription.status]?.label}
                                </Badge>
                                {tenant.subscription.status === "trial" && tenant.subscription.trial_ends_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(tenant.subscription.trial_ends_at), "dd MMM", { locale: dateLocale })}
                                  </span>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {tenant.subscription ? `$${tenant.subscription.price_monthly}` : "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell whitespace-nowrap">
                            {format(new Date(tenant.created_at), "dd MMM yyyy", { locale: dateLocale })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon"
                                className={`h-7 w-7 ${tenant.subscription?.status === "active" ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}`}
                                onClick={() => openPlanActivationDialog(tenant)}
                                title={tenant.subscription?.status === "active" ? t("superAdmin.deactivatePlan") : t("superAdmin.activatePlanNoPay")}>
                                <Crown className="h-3.5 w-3.5" />
                              </Button>
                              {tenant.subscription?.status === "trial" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary"
                                  onClick={() => openExtendTrialDialog(tenant)} title={t("superAdmin.extendTrialTooltip")}>
                                  <Clock className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tenant)} title={t("superAdmin.edit")}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                                title={t("superAdmin.deleteChurch")}
                                onClick={() => {
                                  if (confirm(t("superAdmin.confirmDeleteMsg").replace("{name}", tenant.name))) {
                                    deleteTenantMutation.mutate(tenant.id);
                                  }
                                }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("superAdmin.noClientsRegistered")}</p>
                    <p className="text-sm">{t("superAdmin.clickNewClient")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <TenantRequestsManager />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  {t("superAdmin.modificationHistory")}
                </CardTitle>
                <CardDescription>{t("superAdmin.auditJournal")}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAuditLogs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : auditLogs && auditLogs.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("superAdmin.dateCol")}</TableHead>
                          <TableHead>{t("superAdmin.churchCol")}</TableHead>
                          <TableHead>{t("superAdmin.actionCol")}</TableHead>
                          <TableHead>{t("superAdmin.detailsCol")}</TableHead>
                          <TableHead>{t("superAdmin.byCol")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="text-sm">
                                <p>{format(new Date(log.created_at), "dd MMM yyyy", { locale: dateLocale })}</p>
                                <p className="text-muted-foreground text-xs">
                                  {format(new Date(log.created_at), "HH:mm", { locale: dateLocale })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{log.tenant_name}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                log.action_type === "trial_extended" ? "secondary" : 
                                log.action_type === "plan_activated" ? "default" :
                                log.action_type === "plan_deactivated" ? "destructive" : "outline"
                              }>
                                {getAuditActionLabel(log.action_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-xs">
                                {log.notes && <p className="truncate">{log.notes}</p>}
                                {log.new_values?.trial_ends_at && (
                                  <p className="text-muted-foreground text-xs">
                                    {t("superAdmin.newTrialUntil")} {format(new Date(log.new_values.trial_ends_at as string), "dd MMM yyyy", { locale: dateLocale })}
                                  </p>
                                )}
                                {log.old_values?.trial_ends_at && (
                                  <p className="text-muted-foreground text-xs">
                                    {t("superAdmin.oldTrial")} {format(new Date(log.old_values.trial_ends_at as string), "dd MMM yyyy", { locale: dateLocale })}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{log.user_email || t("superAdmin.system")}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("superAdmin.noHistory")}</p>
                    <p className="text-sm">{t("superAdmin.historyDesc")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AdminInviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} tenant={selectedTenantForInvite} />
        <TenantAdminManager open={adminManagerOpen} onOpenChange={setAdminManagerOpen} tenant={selectedTenantForAdmin} />

        {/* Extend Trial Dialog */}
        <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("superAdmin.extendFreeTrialTitle")}
              </DialogTitle>
              <DialogDescription>
                {selectedTenantForExtend && (
                  <>
                    {t("superAdmin.extendTrialForLabel")} <strong>{selectedTenantForExtend.name}</strong>
                    {selectedTenantForExtend.subscription?.trial_ends_at && (
                      <span className="block mt-1 text-sm">
                        {t("superAdmin.currentTrialEndsOn")} {format(new Date(selectedTenantForExtend.subscription.trial_ends_at), "dd MMM yyyy", { locale: dateLocale })}
                      </span>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("superAdmin.newTrialDuration")}</Label>
                <Select value={extendTrialDuration} onValueChange={(v) => setExtendTrialDuration(v as TrialDuration)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIAL_DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {extendTrialDuration === "custom" && (
                <div className="space-y-2">
                  <Label>{t("superAdmin.customEndDate")}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {extendCustomDate ? format(extendCustomDate, "dd MMM yyyy", { locale: dateLocale }) : t("superAdmin.selectDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={extendCustomDate} onSelect={setExtendCustomDate}
                        disabled={(date) => date < new Date()} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {extendTrialDuration !== "custom" && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("superAdmin.newTrialUntilLabel")}</span>{" "}
                    <strong>{format(calculateTrialEndDate(extendTrialDuration), "dd MMMM yyyy", { locale: dateLocale })}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>
                {t("superAdmin.cancel")}
              </Button>
              <Button onClick={handleExtendTrial}
                disabled={extendTrialMutation.isPending || (extendTrialDuration === "custom" && !extendCustomDate)}>
                {extendTrialMutation.isPending ? t("superAdmin.extendingAction") : t("superAdmin.extendTrialBtn")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plan Activation Dialog */}
        <Dialog open={planActivationDialogOpen} onOpenChange={setPlanActivationDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {t("superAdmin.manualPlanManagement")}
              </DialogTitle>
              <DialogDescription>
                {selectedTenantForPlan && (
                  <>
                    {t("superAdmin.managePlanFor")} <strong>{selectedTenantForPlan.name}</strong>
                    <span className="block mt-1 text-sm">
                      {t("superAdmin.currentStatus")} <Badge variant={STATUS_CONFIG[selectedTenantForPlan.subscription?.status || "trial"]?.variant}>
                        {STATUS_CONFIG[selectedTenantForPlan.subscription?.status || "trial"]?.label}
                      </Badge>
                      {selectedTenantForPlan.subscription?.plan && (
                        <> - {t("superAdmin.planLabel")} <strong>{PLAN_CONFIG[selectedTenantForPlan.subscription.plan]?.label}</strong></>
                      )}
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("superAdmin.planToActivate")}</Label>
                <Select value={selectedPlanForActivation} onValueChange={(v) => setSelectedPlanForActivation(v as SubscriptionPlan)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label} {config.price > 0 ? `- $${config.price}${t("superAdmin.perMonth")}` : `- ${t("superAdmin.free")}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">{t("superAdmin.members")}</p>
                      <p className="font-semibold">{PLAN_CONFIG[selectedPlanForActivation].members === -1 ? "∞" : PLAN_CONFIG[selectedPlanForActivation].members}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("superAdmin.branches")}</p>
                      <p className="font-semibold">{PLAN_CONFIG[selectedPlanForActivation].branches === -1 ? "∞" : PLAN_CONFIG[selectedPlanForActivation].branches}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("superAdmin.users")}</p>
                      <p className="font-semibold">{PLAN_CONFIG[selectedPlanForActivation].users === -1 ? "∞" : PLAN_CONFIG[selectedPlanForActivation].users}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t("superAdmin.storage")}</p>
                      <p className="font-semibold">{PLAN_CONFIG[selectedPlanForActivation].storage === -1 ? "∞" : `${PLAN_CONFIG[selectedPlanForActivation].storage}MB`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 [&>svg]:text-amber-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("superAdmin.adminAction")}</AlertTitle>
                <AlertDescription>{t("superAdmin.adminActionDesc")}</AlertDescription>
              </Alert>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPlanActivationDialogOpen(false)}>
                {t("superAdmin.cancel")}
              </Button>
              {selectedTenantForPlan?.subscription?.status === "active" ? (
                <Button variant="destructive" onClick={() => handleActivatePlan(false)} disabled={activatePlanMutation.isPending}>
                  {activatePlanMutation.isPending ? t("superAdmin.deactivating") : (
                    <><PowerOff className="h-4 w-4 mr-2" />{t("superAdmin.deactivatePlanBtn")}</>
                  )}
                </Button>
              ) : (
                <Button onClick={() => handleActivatePlan(true)} disabled={activatePlanMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  {activatePlanMutation.isPending ? t("superAdmin.activating") : (
                    <><Power className="h-4 w-4 mr-2" />{t("superAdmin.activatePlanNoPayBtn")}</>
                  )}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
