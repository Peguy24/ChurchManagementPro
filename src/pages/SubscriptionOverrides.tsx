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
import { CreditCard, Plus, Trash2, Percent, DollarSign, Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/currency";

export default function SubscriptionOverrides() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: "",
    discount_type: "percentage",
    discount_value: "",
    reason: "",
    valid_until: "",
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
      const { error } = await supabase.from("subscription_discounts").insert({
        tenant_id: form.tenant_id,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        reason: form.reason || null,
        valid_until: form.valid_until || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-discounts"] });
      toast.success(t("superAdmin.overrides.discountAdded"));
      setDialogOpen(false);
      setForm({ tenant_id: "", discount_type: "percentage", discount_value: "", reason: "", valid_until: "" });
    },
    onError: () => toast.error(t("common.error")),
  });

  const removeDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_discounts").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-discounts"] });
      toast.success(t("superAdmin.overrides.discountRemoved"));
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
  const totalDiscountValue = activeDiscounts.reduce((sum, d) => sum + (d.discount_value || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CreditCard className="h-7 w-7" />
              {t("superAdmin.overrides.title")}
            </h1>
            <p className="text-muted-foreground">{t("superAdmin.overrides.subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> {t("superAdmin.overrides.addDiscount")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("superAdmin.overrides.addDiscount")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("superAdmin.overrides.church")}</Label>
                  <Select value={form.tenant_id} onValueChange={v => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("superAdmin.overrides.selectChurch")} /></SelectTrigger>
                    <SelectContent>
                      {(tenants || []).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("superAdmin.overrides.discountType")}</Label>
                    <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t("superAdmin.overrides.percentage")}</SelectItem>
                        <SelectItem value="fixed">{t("superAdmin.overrides.fixedAmount")}</SelectItem>
                        <SelectItem value="free">{t("superAdmin.overrides.freeAccess")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t("superAdmin.overrides.value")}</Label>
                    <Input
                      type="number"
                      value={form.discount_value}
                      onChange={e => setForm({ ...form, discount_value: e.target.value })}
                      placeholder={form.discount_type === "percentage" ? "%" : "$"}
                      disabled={form.discount_type === "free"}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t("superAdmin.overrides.reason")}</Label>
                  <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>{t("superAdmin.overrides.validUntil")}</Label>
                  <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
                </div>
                <Button
                  onClick={() => addDiscount.mutate()}
                  disabled={!form.tenant_id || (!form.discount_value && form.discount_type !== "free") || addDiscount.isPending}
                  className="w-full"
                >
                  {t("superAdmin.overrides.apply")}
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
                  <p className="text-xs text-muted-foreground">{t("superAdmin.overrides.activeDiscounts")}</p>
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
                  <p className="text-xs text-muted-foreground">{t("superAdmin.overrides.freeAccessCount")}</p>
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
                  <p className="text-xs text-muted-foreground">{t("superAdmin.overrides.paidSubscriptions")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>{t("superAdmin.overrides.activeDiscounts")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("superAdmin.overrides.church")}</TableHead>
                  <TableHead>{t("superAdmin.overrides.discountType")}</TableHead>
                  <TableHead>{t("superAdmin.overrides.value")}</TableHead>
                  <TableHead>{t("superAdmin.overrides.reason")}</TableHead>
                  <TableHead>{t("superAdmin.overrides.validUntil")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t("superAdmin.overrides.noDiscounts")}
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
            <CardTitle>{t("superAdmin.overrides.allSubscriptions")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("superAdmin.overrides.church")}</TableHead>
                  <TableHead>{t("superAdmin.plan")}</TableHead>
                  <TableHead>{t("superAdmin.status")}</TableHead>
                  <TableHead>{t("superAdmin.overrides.monthlyPrice")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(subscriptions || []).slice(0, 20).map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{(s as any).tenants?.name || "-"}</TableCell>
                    <TableCell><Badge className={planColors[s.plan] || ""}>{s.plan}</Badge></TableCell>
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
