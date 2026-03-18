import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Plus, Trash2, Percent, DollarSign, Gift, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

const localTranslations: Record<string, Record<string, string>> = {
  en: {
    title: "Subscription Overrides",
    subtitle: "Manage discounts and special pricing for churches",
    addDiscount: "Add Discount",
    church: "Church",
    selectChurch: "Select a church",
    discountType: "Discount Type",
    percentage: "Percentage",
    fixedAmount: "Fixed Amount",
    freeAccess: "Free Access",
    value: "Value",
    reason: "Reason",
    validUntil: "Valid Until",
    apply: "Apply Discount",
    activeDiscounts: "Active Discounts",
    freeAccessCount: "Free Access Grants",
    paidSubscriptions: "Paid Subscriptions",
    discountAdded: "Discount added successfully",
    discountRemoved: "Discount removed",
    noDiscounts: "No active discounts",
    allSubscriptions: "All Subscriptions",
    monthlyPrice: "Monthly Price",
    plan: "Plan",
    status: "Status",
    actions: "Actions",
    error: "Error",
    effect: "Effect",
    immediate: "Immediate",
    nextRenewal: "Next Renewal",
    onCheckout: "On Checkout",
    effectHintFree: "Free access activates immediately — bypasses billing.",
    effectHintOther: "Applied at next renewal if already subscribed, or on first checkout.",
  },
  fr: {
    title: "Gestion des Abonnements",
    subtitle: "Gérez les réductions et tarifs spéciaux pour les églises",
    addDiscount: "Ajouter Réduction",
    church: "Église",
    selectChurch: "Sélectionner une église",
    discountType: "Type de réduction",
    percentage: "Pourcentage",
    fixedAmount: "Montant fixe",
    freeAccess: "Accès gratuit",
    value: "Valeur",
    reason: "Raison",
    validUntil: "Valide jusqu'au",
    apply: "Appliquer la réduction",
    activeDiscounts: "Réductions actives",
    freeAccessCount: "Accès gratuits",
    paidSubscriptions: "Abonnements payants",
    discountAdded: "Réduction ajoutée avec succès",
    discountRemoved: "Réduction supprimée",
    noDiscounts: "Aucune réduction active",
    allSubscriptions: "Tous les Abonnements",
    monthlyPrice: "Prix mensuel",
    plan: "Plan",
    status: "Statut",
    actions: "Actions",
    error: "Erreur",
    effect: "Effet",
    immediate: "Immédiat",
    nextRenewal: "Prochain renouvellement",
    onCheckout: "Au paiement",
    effectHintFree: "L'accès gratuit s'active immédiatement — pas de facturation.",
    effectHintOther: "Appliqué au prochain renouvellement si déjà abonné, ou au premier paiement.",
  },
  ht: {
    title: "Jesyon Abònman",
    subtitle: "Jere rabè ak pri espesyal pou legliz yo",
    addDiscount: "Ajoute Rabè",
    church: "Legliz",
    selectChurch: "Chwazi yon legliz",
    discountType: "Tip Rabè",
    percentage: "Pousantaj",
    fixedAmount: "Montan fiks",
    freeAccess: "Aksè gratis",
    value: "Valè",
    reason: "Rezon",
    validUntil: "Valab jiska",
    apply: "Aplike Rabè",
    activeDiscounts: "Rabè Aktif",
    freeAccessCount: "Aksè Gratis",
    paidSubscriptions: "Abònman Peye",
    discountAdded: "Rabè ajoute avèk siksè",
    discountRemoved: "Rabè retire",
    noDiscounts: "Pa gen rabè aktif",
    allSubscriptions: "Tout Abònman",
    monthlyPrice: "Pri mansyèl",
    plan: "Plan",
    status: "Estati",
    actions: "Aksyon",
    error: "Erè",
    effect: "Efè",
    immediate: "Imedyat",
    nextRenewal: "Pwochen renouvèlman",
    onCheckout: "Lè peye",
    effectHintFree: "Aksè gratis aktive touswit — pa gen fakti.",
    effectHintOther: "Aplike nan pwochen renouvèlman si deja abòne, oswa nan premye pèman.",
  },
};

export default function SubscriptionOverrides() {
  const { language } = useLanguage();
  const lt = (key: string) => localTranslations[language]?.[key] || localTranslations.en[key] || key;
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    discount_type: "percentage",
    discount_value: "",
    reason: "",
    valid_until: "",
    target_plan: "",
  });

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-discount"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: discounts, isLoading } = useQuery({
    queryKey: ["subscription-discounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_discounts")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["all-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*, tenants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addDiscount = useMutation({
    mutationFn: async () => {
      // 1. Insert the discount record
      const { data: inserted, error } = await supabase.from("subscription_discounts").insert({
        tenant_id: form.tenant_id,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        reason: form.reason || null,
        valid_until: form.valid_until || null,
      }).select("id").single();
      if (error) throw error;

      // 2. Apply discount to existing Stripe subscription (if any)
      const { data: { session } } = await supabase.auth.getSession();
      if (session && inserted) {
        try {
          const { data: result, error: applyError } = await supabase.functions.invoke('apply-discount', {
            body: {
              tenant_id: form.tenant_id,
              discount_id: inserted.id,
              discount_type: form.discount_type,
              discount_value: parseFloat(form.discount_value) || 0,
              valid_until: form.valid_until || null,
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (applyError) {
            console.error("Apply discount error:", applyError);
          } else if (result?.applied) {
            toast.success(result.method === "free_access" 
              ? "Free access activated — Stripe subscription cancelled" 
              : "Discount will apply at next renewal");
          } else if (result?.reason) {
            const reasons: Record<string, string> = {
              no_users: "No users found for this church",
              no_email: "No email found for tenant users",
              no_stripe_customer: "Church has no Stripe account — discount saved for future checkout",
              no_active_subscription: "No active subscription — discount saved for future checkout",
            };
            toast.info(reasons[result.reason] || "Discount saved");
          }
        } catch (e) {
          console.error("Failed to apply discount to Stripe:", e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-discounts"] });
      toast.success(lt("discountAdded"));
      setDialogOpen(false);
      setForm({ tenant_id: "", discount_type: "percentage", discount_value: "", reason: "", valid_until: "" });
    },
    onError: () => toast.error(lt("error")),
  });

  const removeDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_discounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-discounts"] });
      toast.success(lt("discountRemoved"));
    },
  });

  const planColors: Record<string, string> = {
    free: "bg-green-100 text-green-800",
    basic: "bg-slate-100 text-slate-800",
    standard: "bg-blue-100 text-blue-800",
    premium: "bg-purple-100 text-purple-800",
    enterprise: "bg-amber-100 text-amber-800",
  };

  const activeDiscounts = (discounts || []).filter(d => d.is_active);

  const getEffectTiming = (discount: any) => {
    if (discount.discount_type === "free") {
      return { label: lt("immediate"), className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" };
    }
    const hasActiveSub = (subscriptions || []).some(
      (s: any) => s.tenant_id === discount.tenant_id && s.status === "active"
    );
    if (hasActiveSub) {
      return { label: lt("nextRenewal"), className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" };
    }
    return { label: lt("onCheckout"), className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-7 w-7" />
              {lt("title")}
            </h1>
            <p className="text-muted-foreground">{lt("subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> {lt("addDiscount")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{lt("addDiscount")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{lt("church")}</Label>
                  <Select value={form.tenant_id} onValueChange={v => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger><SelectValue placeholder={lt("selectChurch")} /></SelectTrigger>
                    <SelectContent>
                      {(tenants || []).map(tenant => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{lt("discountType")}</Label>
                    <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{lt("percentage")}</SelectItem>
                        <SelectItem value="fixed">{lt("fixedAmount")}</SelectItem>
                        <SelectItem value="free">{lt("freeAccess")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{lt("value")}</Label>
                    <Input
                      type="number"
                      value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: e.target.value })}
                      placeholder={form.discount_type === "percentage" ? "%" : "$"}
                      disabled={form.discount_type === "free"}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {form.discount_type === "free" ? lt("effectHintFree") : lt("effectHintOther")}
                </p>
                <div>
                  <Label>{lt("reason")}</Label>
                  <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>{lt("validUntil")}</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
                </div>
                <Button
                  onClick={() => addDiscount.mutate()}
                  disabled={!form.tenant_id || (!form.discount_value && form.discount_type !== "free") || addDiscount.isPending}
                  className="w-full"
                >
                  {lt("apply")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Gift className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{activeDiscounts.length}</p>
                  <p className="text-xs text-muted-foreground">{lt("activeDiscounts")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Percent className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{activeDiscounts.filter(d => d.discount_type === "free").length}</p>
                  <p className="text-xs text-muted-foreground">{lt("freeAccessCount")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{(subscriptions || []).filter(s => s.status === "active").length}</p>
                  <p className="text-xs text-muted-foreground">{lt("paidSubscriptions")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>{lt("activeDiscounts")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt("church")}</TableHead>
                  <TableHead>{lt("discountType")}</TableHead>
                  <TableHead>{lt("value")}</TableHead>
                  <TableHead>{lt("reason")}</TableHead>
                   <TableHead>{lt("effect")}</TableHead>
                   <TableHead>{lt("validUntil")}</TableHead>
                   <TableHead>{lt("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeDiscounts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{(d as any).tenants?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {d.discount_type === "percentage" ? "%" : d.discount_type === "free" ? "Free" : "$"}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.discount_type === "free" ? "100%" : `${d.discount_value}${d.discount_type === "percentage" ? "%" : "$"}`}</TableCell>
                     <TableCell className="text-sm max-w-[200px] truncate">{d.reason || "-"}</TableCell>
                     <TableCell>
                       {(() => {
                         const timing = getEffectTiming(d);
                         return <Badge className={timing.className}>{timing.label}</Badge>;
                       })()}
                     </TableCell>
                     <TableCell className="text-sm">{d.valid_until ? format(new Date(d.valid_until), "dd/MM/yyyy") : "∞"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeDiscount.mutate(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!activeDiscounts.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {lt("noDiscounts")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* All Subscriptions Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{lt("allSubscriptions")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lt("church")}</TableHead>
                  <TableHead>{lt("plan")}</TableHead>
                  <TableHead>{lt("status")}</TableHead>
                  <TableHead>{lt("monthlyPrice")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subscriptions || []).slice(0, 20).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s as any).tenants?.name || "-"}</TableCell>
                    <TableCell><Badge className={s.status === "trial" ? "bg-blue-100 text-blue-800" : planColors[s.plan] || ""}>{s.status === "trial" ? "Trial" : s.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={s.status === "active" ? "default" : s.status === "trial" ? "secondary" : "destructive"}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(s.price_monthly || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
