import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useCurrency } from "@/hooks/useCurrency";

export default function Budgets() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const { formatAmount } = useCurrency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch budgets with expenses
  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select(`
          *,
          category:expense_categories(name),
          branch:branches(name)
        `)
        .eq("fiscal_year", selectedYear)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses for the year
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses-by-category", selectedYear],
    queryFn: async () => {
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const { data, error } = await supabase
        .from("expenses")
        .select("category_id, amount")
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .eq("status", "approved");
      if (error) throw error;
      return data;
    },
  });

  // Calculate spent amounts by category
  const spentByCategory = expenses.reduce((acc, expense) => {
    if (expense.category_id) {
      acc[expense.category_id] = (acc[expense.category_id] || 0) + Number(expense.amount);
    }
    return acc;
  }, {} as Record<string, number>);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    fiscal_year: currentYear,
    category_id: "",
    branch_id: "",
    planned_amount: "",
    notes: "",
  });

  const createBudget = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("budgets").insert({
        name: data.name,
        fiscal_year: data.fiscal_year,
        category_id: data.category_id || null,
        branch_id: data.branch_id || null,
        planned_amount: parseFloat(data.planned_amount),
        notes: data.notes || null,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      setDialogOpen(false);
      setFormData({
        name: "",
        fiscal_year: currentYear,
        category_id: "",
        branch_id: "",
        planned_amount: "",
        notes: "",
      });
      toast({ title: t("common.save"), description: "Budget créé avec succès" });
    },
    onError: () => {
      toast({ title: t("errors.serverError"), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.planned_amount) {
      toast({ title: t("errors.required"), variant: "destructive" });
      return;
    }
    createBudget.mutate(formData);
  };

  // Calculate totals
  const totalPlanned = budgets.reduce((sum, b) => sum + Number(b.planned_amount), 0);
  const totalSpent = Object.values(spentByCategory).reduce((sum, v) => sum + v, 0);
  const percentUsed = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("budget.title")}</h1>
            <p className="text-muted-foreground">{t("budget.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("budget.addBudget")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("budget.addBudget")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("budget.budgetName")}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Budget Entretien 2025"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("budget.fiscalYear")}</Label>
                      <Select
                        value={formData.fiscal_year.toString()}
                        onValueChange={(v) => setFormData({ ...formData, fiscal_year: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("budget.plannedAmount")}</Label>
                      <Input
                        type="number"
                        value={formData.planned_amount}
                        onChange={(e) => setFormData({ ...formData, planned_amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("budget.category")}</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("common.all")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("common.all")}</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("members.branch")}</Label>
                    <Select
                      value={formData.branch_id}
                      onValueChange={(v) => setFormData({ ...formData, branch_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("members.allBranches")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("members.allBranches")}</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={createBudget.isPending}>
                      {t("common.save")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("budget.totalPlanned")}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(totalPlanned)}</div>
              <p className="text-xs text-muted-foreground">{t("budget.fiscalYear")} {selectedYear}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("budget.totalSpent")}</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">${totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{t("budget.expensesApproved")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("budget.remaining")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${(totalPlanned - totalSpent).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{t("budget.available")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("budget.utilizationRate")}</CardTitle>
              {percentUsed > 90 && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{percentUsed.toFixed(1)}%</div>
              <Progress value={percentUsed} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Budget Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("budget.budgetDetails")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
            ) : budgets.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t("budget.noBudgets")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("budget.budgetName")}</TableHead>
                    <TableHead>{t("budget.category")}</TableHead>
                    <TableHead>{t("members.branch")}</TableHead>
                    <TableHead className="text-right">{t("budget.planned")}</TableHead>
                    <TableHead className="text-right">{t("budget.spent")}</TableHead>
                    <TableHead className="text-right">{t("budget.remaining")}</TableHead>
                    <TableHead>{t("budget.progress")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => {
                    const spent = budget.category_id ? spentByCategory[budget.category_id] || 0 : 0;
                    const planned = Number(budget.planned_amount);
                    const remaining = planned - spent;
                    const percent = planned > 0 ? (spent / planned) * 100 : 0;

                    return (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.name}</TableCell>
                        <TableCell>{budget.category?.name || "-"}</TableCell>
                        <TableCell>{budget.branch?.name || t("common.all")}</TableCell>
                        <TableCell className="text-right">${planned.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">${spent.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={remaining < 0 ? "text-destructive" : "text-primary"}>
                            ${remaining.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(percent, 100)} className="w-20" />
                            <Badge variant={percent > 100 ? "destructive" : percent > 80 ? "secondary" : "outline"}>
                              {percent.toFixed(0)}%
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
