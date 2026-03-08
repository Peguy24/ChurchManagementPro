import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, TrendingUp, Plus, Download, Trash2, Edit, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatCurrency } from "@/lib/currency";
import { exportToCsv, formatDateForCsv, formatCurrencyForCsv } from "@/lib/csvExport";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  "hosting",
  "licenses",
  "marketing",
  "support_tools",
  "payment_fees",
  "salaries",
  "office",
  "general",
] as const;

type ExpenseCategory = typeof CATEGORIES[number];

interface PlatformExpense {
  id: string;
  amount: number;
  expense_date: string;
  category: string;
  description: string;
  vendor: string | null;
  notes: string | null;
  is_recurring: boolean | null;
  recurring_frequency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const categoryLabels: Record<string, Record<ExpenseCategory, string>> = {
  fr: {
    hosting: "Hébergement",
    licenses: "Licences",
    marketing: "Marketing",
    support_tools: "Outils de support",
    payment_fees: "Frais de paiement",
    salaries: "Salaires",
    office: "Bureau",
    general: "Général",
  },
  en: {
    hosting: "Hosting",
    licenses: "Licenses",
    marketing: "Marketing",
    support_tools: "Support Tools",
    payment_fees: "Payment Fees",
    salaries: "Salaries",
    office: "Office",
    general: "General",
  },
  ht: {
    hosting: "Ebèjman",
    licenses: "Lisans",
    marketing: "Maketing",
    support_tools: "Zouti sipò",
    payment_fees: "Frè peman",
    salaries: "Salè",
    office: "Biwo",
    general: "Jeneral",
  },
};

export default function PlatformAccounting() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PlatformExpense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    category: "general" as string,
    description: "",
    vendor: "",
    notes: "",
    is_recurring: false,
    recurring_frequency: "",
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      expense_date: new Date().toISOString().split("T")[0],
      category: "general",
      description: "",
      vendor: "",
      notes: "",
      is_recurring: false,
      recurring_frequency: "",
    });
    setEditingExpense(null);
  };

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["platform-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return (data || []) as PlatformExpense[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("platform_expenses").insert({
        amount: parseFloat(data.amount),
        expense_date: data.expense_date,
        category: data.category,
        description: data.description,
        vendor: data.vendor || null,
        notes: data.notes || null,
        is_recurring: data.is_recurring,
        recurring_frequency: data.is_recurring ? data.recurring_frequency : null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-expenses"] });
      toast.success(t("platformAccounting.expenseAdded"));
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("platformAccounting.errorAdding")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("platform_expenses")
        .update({
          amount: parseFloat(data.amount),
          expense_date: data.expense_date,
          category: data.category,
          description: data.description,
          vendor: data.vendor || null,
          notes: data.notes || null,
          is_recurring: data.is_recurring,
          recurring_frequency: data.is_recurring ? data.recurring_frequency : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-expenses"] });
      toast.success(t("platformAccounting.expenseUpdated"));
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error(t("platformAccounting.errorUpdating")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-expenses"] });
      toast.success(t("platformAccounting.expenseDeleted"));
    },
    onError: () => toast.error(t("platformAccounting.errorDeleting")),
  });

  const handleSubmit = () => {
    if (!formData.amount || !formData.description) {
      toast.error(t("platformAccounting.fillRequired"));
      return;
    }
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (expense: PlatformExpense) => {
    setEditingExpense(expense);
    setFormData({
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor || "",
      notes: expense.notes || "",
      is_recurring: expense.is_recurring || false,
      recurring_frequency: expense.recurring_frequency || "",
    });
    setDialogOpen(true);
  };

  // Filtered expenses
  const filteredExpenses = (expenses || []).filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterMonth && !e.expense_date.startsWith(filterMonth)) return false;
    return true;
  });

  // Stats
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthExpenses = (expenses || [])
    .filter((e) => e.expense_date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
  const lastMonthExpenses = (expenses || [])
    .filter((e) => e.expense_date.startsWith(lastMonth))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyChange = lastMonthExpenses > 0
    ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
    : 0;
  const recurringTotal = (expenses || [])
    .filter((e) => e.is_recurring)
    .reduce((sum, e) => sum + e.amount, 0);

  // Monthly chart data
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    (expenses || []).forEach((e) => {
      const month = e.expense_date.slice(0, 7);
      months[month] = (months[month] || 0) + e.amount;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month, total }));
  })();

  // Category breakdown
  const categoryData = (() => {
    const cats: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      const label = categoryLabels[language]?.[e.category as ExpenseCategory] || e.category;
      cats[label] = (cats[label] || 0) + e.amount;
    });
    return Object.entries(cats)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  })();

  const handleExport = () => {
    if (!filteredExpenses.length) {
      toast.error(t("superAdmin.noDataToExport"));
      return;
    }
    const columns = [
      { key: "expense_date", header: t("common.date"), formatter: (v: string) => formatDateForCsv(v) },
      { key: "description", header: t("platformAccounting.description") },
      { key: "category", header: t("platformAccounting.category"), formatter: (v: string) => categoryLabels[language]?.[v as ExpenseCategory] || v },
      { key: "amount", header: t("platformAccounting.amount"), formatter: (v: number) => formatCurrencyForCsv(v) },
      { key: "vendor", header: t("platformAccounting.vendor") },
      { key: "is_recurring", header: t("platformAccounting.recurring"), formatter: (v: boolean) => v ? "Yes" : "No" },
    ];
    exportToCsv(filteredExpenses, columns, `platform_expenses_${new Date().toISOString().split("T")[0]}`);
    toast.success(t("superAdmin.csvExported"));
  };

  const getCatLabel = (cat: string) => categoryLabels[language]?.[cat as ExpenseCategory] || cat;
  const dateLocale = language === "fr" ? "fr-FR" : language === "ht" ? "fr-HT" : "en-US";

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("platformAccounting.title")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t("platformAccounting.subtitle")}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t("superAdmin.exportCsv")}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("platformAccounting.addExpense")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? t("platformAccounting.editExpense") : t("platformAccounting.addExpense")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>{t("platformAccounting.description")} *</Label>
                    <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("platformAccounting.amount")} *</Label>
                      <Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                    </div>
                    <div>
                      <Label>{t("common.date")}</Label>
                      <Input type="date" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{t("platformAccounting.category")}</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{getCatLabel(cat)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("platformAccounting.vendor")}</Label>
                      <Input value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>{t("platformAccounting.notes")}</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={formData.is_recurring} onCheckedChange={(v) => setFormData({ ...formData, is_recurring: v })} />
                    <Label>{t("platformAccounting.recurring")}</Label>
                  </div>
                  {formData.is_recurring && (
                    <div>
                      <Label>{t("platformAccounting.frequency")}</Label>
                      <Select value={formData.recurring_frequency} onValueChange={(v) => setFormData({ ...formData, recurring_frequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">{t("platformAccounting.monthly")}</SelectItem>
                          <SelectItem value="quarterly">{t("platformAccounting.quarterly")}</SelectItem>
                          <SelectItem value="yearly">{t("platformAccounting.yearly")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingExpense ? t("common.save") : t("platformAccounting.addExpense")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platformAccounting.totalExpenses")}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platformAccounting.thisMonth")}</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(thisMonthExpenses)}</div>
                  {monthlyChange !== 0 && (
                    <p className={`text-xs flex items-center gap-1 ${monthlyChange > 0 ? "text-destructive" : "text-green-600"}`}>
                      {monthlyChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(monthlyChange).toFixed(1)}% {t("platformAccounting.vsLastMonth")}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platformAccounting.recurringCosts")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{formatCurrency(recurringTotal)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("platformAccounting.expenseCount")}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{filteredExpenses.length}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("platformAccounting.monthlyTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t("platformAccounting.noData")}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("platformAccounting.byCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-8">{t("platformAccounting.noData")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("platformAccounting.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("platformAccounting.allCategories")}</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{getCatLabel(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full sm:w-[180px]"
          />
          {(filterCategory !== "all" || filterMonth) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterCategory("all"); setFilterMonth(""); }}>
              {t("platformAccounting.clearFilters")}
            </Button>
          )}
        </div>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("platformAccounting.noExpenses")}</p>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("platformAccounting.description")}</TableHead>
                    <TableHead>{t("platformAccounting.category")}</TableHead>
                    <TableHead>{t("platformAccounting.vendor")}</TableHead>
                    <TableHead className="text-right">{t("platformAccounting.amount")}</TableHead>
                    <TableHead className="text-right">{t("platformAccounting.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.expense_date).toLocaleDateString(dateLocale)}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{expense.description}</span>
                          {expense.is_recurring && (
                            <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {t("platformAccounting.recurring")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCatLabel(expense.category)}</TableCell>
                      <TableCell>{expense.vendor || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(expense.amount)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(expense.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
