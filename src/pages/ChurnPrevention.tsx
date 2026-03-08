import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldAlert, RefreshCw, TrendingDown, Users, AlertTriangle, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

export default function ChurnPrevention() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<string>("all");

  const { data: tenants } = useQuery({
    queryKey: ["tenants-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: predictions, isLoading } = useQuery({
    queryKey: ["churn-predictions", selectedTenant],
    queryFn: async () => {
      let query = supabase
        .from("member_risk_predictions")
        .select("*, members(first_name, last_name, email, phone, tenant_id, tenants(name))")
        .order("risk_probability", { ascending: false })
        .limit(100);

      if (selectedTenant !== "all") {
        query = query.eq("tenant_id", selectedTenant);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const runPrediction = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const body = selectedTenant !== "all" ? { tenant_id: selectedTenant } : {};
      const res = await supabase.functions.invoke("predict-churn-risk", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["churn-predictions"] });
      toast.success(`${t("superAdmin.churn.predictionComplete")} - ${data?.results?.highRisk || 0} ${t("superAdmin.churn.highRiskFound")}`);
    },
    onError: () => toast.error(t("common.error")),
  });

  const highRisk = (predictions || []).filter(p => p.risk_category === "high");
  const mediumRisk = (predictions || []).filter(p => p.risk_category === "medium");
  const lowRisk = (predictions || []).filter(p => p.risk_category === "low");

  const riskBadge = (category: string) => {
    const config: Record<string, { variant: "destructive" | "secondary" | "outline"; label: string }> = {
      high: { variant: "destructive", label: t("superAdmin.churn.high") },
      medium: { variant: "secondary", label: t("superAdmin.churn.medium") },
      low: { variant: "outline", label: t("superAdmin.churn.low") },
    };
    const c = config[category] || config.low;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-7 w-7" />
              {t("superAdmin.churn.title")}
            </h1>
            <p className="text-muted-foreground">{t("superAdmin.churn.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("superAdmin.churn.allChurches")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("superAdmin.churn.allChurches")}</SelectItem>
                {(tenants || []).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => runPrediction.mutate()} disabled={runPrediction.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${runPrediction.isPending ? "animate-spin" : ""}`} />
              {t("superAdmin.churn.runAnalysis")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{highRisk.length}</p>
                  <p className="text-xs text-muted-foreground">{t("superAdmin.churn.highRisk")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{mediumRisk.length}</p>
                  <p className="text-xs text-muted-foreground">{t("superAdmin.churn.mediumRisk")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{lowRisk.length}</p>
                  <p className="text-xs text-muted-foreground">{t("superAdmin.churn.lowRisk")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{(predictions || []).length}</p>
                  <p className="text-xs text-muted-foreground">{t("superAdmin.churn.totalAnalyzed")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High Risk Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("superAdmin.churn.atRiskMembers")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("superAdmin.churn.member")}</TableHead>
                    <TableHead>{t("superAdmin.churn.church")}</TableHead>
                    <TableHead>{t("superAdmin.churn.riskLevel")}</TableHead>
                    <TableHead>{t("superAdmin.churn.probability")}</TableHead>
                    <TableHead>{t("superAdmin.churn.daysSinceAttendance")}</TableHead>
                    <TableHead>{t("superAdmin.churn.factors")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(predictions || []).filter(p => p.risk_category !== "low").slice(0, 50).map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium">{(p as any).members?.first_name} {(p as any).members?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{(p as any).members?.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{(p as any).members?.tenants?.name || "-"}</TableCell>
                      <TableCell>{riskBadge(p.risk_category || "low")}</TableCell>
                      <TableCell className="font-mono text-sm">{((p.risk_probability || 0) * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-sm">{p.days_since_last_attendance || 0} {t("superAdmin.churn.days")}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {((p.contributing_factors as string[]) || []).slice(0, 2).map((f, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{f}</Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!(predictions || []).filter(p => p.risk_category !== "low").length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t("superAdmin.churn.noRiskMembers")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
