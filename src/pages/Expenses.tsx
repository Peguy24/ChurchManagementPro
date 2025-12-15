import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Check, X, Clock, Download, Eye, Building2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Expenses() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    startDate: "",
    endDate: "",
  });

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

  // Fetch cash registers
  const { data: cashRegisters = [] } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profiles for creator info
  const { data: userProfiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filters],
    queryFn: async () => {
      let query = supabase
        .from("expenses")
        .select(`
          *,
          category:expense_categories(name),
          branch:branches(name),
          cash_register:cash_registers(name),
          bank_account:bank_accounts(name)
        `)
        .order("expense_date", { ascending: false });

      if (filters.category && filters.category !== "all") {
        query = query.eq("category_id", filters.category);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status as "pending" | "approved" | "rejected");
      }
      if (filters.startDate) {
        query = query.gte("expense_date", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("expense_date", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    category_id: "",
    branch_id: "",
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    vendor: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
    accountType: "cash" as "cash" | "bank",
    cash_register_id: "",
    bank_account_id: "",
  });

  const getCreatorName = (createdBy: string | null) => {
    if (!createdBy) return "-";
    const profile = userProfiles.find((p) => p.id === createdBy);
    if (profile) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "-";
    }
    return "-";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
  };

  const createExpense = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        category_id: data.category_id || null,
        branch_id: data.branch_id || null,
        amount: parseFloat(data.amount),
        description: data.description,
        expense_date: data.expense_date,
        vendor: data.vendor || null,
        payment_method: data.payment_method,
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        status: "pending",
        created_by: userData?.user?.id || null,
        cash_register_id: data.accountType === "cash" && data.cash_register_id ? data.cash_register_id : null,
        bank_account_id: data.accountType === "bank" && data.bank_account_id ? data.bank_account_id : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: t("common.save"), description: t("expense.created") });
    },
    onError: () => {
      toast({ title: t("errors.serverError"), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      category_id: "",
      branch_id: "",
      amount: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      vendor: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
      accountType: "cash",
      cash_register_id: "",
      bank_account_id: "",
    });
  };

  const updateExpenseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("expenses")
        .update({ 
          status, 
          approved_at: status === "approved" ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: t("common.save") });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.category_id) {
      toast({ title: t("errors.required"), variant: "destructive" });
      return;
    }
    // Validate account selection
    if (formData.accountType === "cash" && !formData.cash_register_id) {
      toast({ title: t("errors.required"), description: "Sélectionnez une caisse", variant: "destructive" });
      return;
    }
    if (formData.accountType === "bank" && !formData.bank_account_id) {
      toast({ title: t("errors.required"), description: "Sélectionnez un compte bancaire", variant: "destructive" });
      return;
    }
    createExpense.mutate(formData);
  };

  const handleViewExpense = (expense: any) => {
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const paymentMethods: Record<string, string> = {
    cash: t("donations.cash"),
    check: t("donations.check"),
    transfer: t("donations.transfer"),
    card: t("donations.card"),
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: t("expense.pending"), variant: "secondary" },
      approved: { label: t("expense.approved"), variant: "default" },
      rejected: { label: t("expense.rejected"), variant: "destructive" },
    };
    return labels[status] || { label: status, variant: "outline" as const };
  };

  // Statistics
  const stats = {
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    pending: expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0),
    approved: expenses.filter((e) => e.status === "approved").reduce((sum, e) => sum + Number(e.amount), 0),
    count: expenses.length,
  };

  const exportData = () => {
    const csv = [
      ["Date", "Description", "Catégorie", "Montant", "Fournisseur", "Statut"].join(","),
      ...expenses.map((e) =>
        [
          e.expense_date,
          `"${e.description}"`,
          e.category?.name || "",
          e.amount,
          e.vendor || "",
          e.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depenses_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("expense.title")}</h1>
            <p className="text-muted-foreground">{t("expense.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData}>
              <Download className="h-4 w-4 mr-2" />
              {t("common.export")}
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("expense.addExpense")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("expense.addExpense")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("donations.amount")} *</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("common.date")} *</Label>
                      <Input
                        type="date"
                        value={formData.expense_date}
                        onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("expense.description")} *</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description de la dépense"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("budget.category")} *</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(v) => setFormData({ ...formData, category_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("expense.selectCategory")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("expense.vendor")} *</Label>
                      <Input
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        placeholder="Nom du bénéficiaire"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("donations.paymentMethod")}</Label>
                      <Select
                        value={formData.payment_method}
                        onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">{t("donations.cash")}</SelectItem>
                          <SelectItem value="check">{t("donations.check")}</SelectItem>
                          <SelectItem value="transfer">{t("donations.transfer")}</SelectItem>
                          <SelectItem value="card">{t("donations.card")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("expense.referenceNumber")}</Label>
                      <Input
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        placeholder="N° justificatif (optionnel)"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("donations.account")} *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.accountType === "cash" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, accountType: "cash", bank_account_id: "" })}
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        {t("finance.cashRegister")}
                      </Button>
                      <Button
                        type="button"
                        variant={formData.accountType === "bank" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, accountType: "bank", cash_register_id: "" })}
                      >
                        <Building2 className="h-4 w-4 mr-1" />
                        {t("finance.bankAccount")}
                      </Button>
                    </div>
                  </div>
                  {formData.accountType === "cash" ? (
                    <div className="space-y-2">
                      <Label>{t("finance.cashRegister")} *</Label>
                      <Select
                        value={formData.cash_register_id}
                        onValueChange={(v) => setFormData({ ...formData, cash_register_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("donations.selectCashRegister")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {cashRegisters.map((cr) => (
                            <SelectItem key={cr.id} value={cr.id}>
                              {cr.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>{t("finance.bankAccount")} *</Label>
                      <Select
                        value={formData.bank_account_id}
                        onValueChange={(v) => setFormData({ ...formData, bank_account_id: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("donations.selectBankAccount")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {bankAccounts.map((ba) => (
                            <SelectItem key={ba.id} value={ba.id}>
                              {ba.name} - {ba.bank_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                  <div className="space-y-2">
                    <Label>{t("donations.notes")}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes additionnelles"
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={createExpense.isPending}>
                      {t("common.save")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("expense.totalExpenses")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stats.count} {t("expense.transactions")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("expense.pendingApproval")}</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">${stats.pending.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{t("expense.awaitingReview")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("expense.approved")}</CardTitle>
              <Check className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">${stats.approved.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{t("expense.confirmedExpenses")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{t("expense.avgExpense")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.count > 0 ? (stats.total / stats.count).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
              </div>
              <p className="text-xs text-muted-foreground">{t("expense.perTransaction")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("budget.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="pending">{t("expense.pending")}</SelectItem>
                  <SelectItem value="approved">{t("expense.approved")}</SelectItem>
                  <SelectItem value="rejected">{t("expense.rejected")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                placeholder={t("common.startDate")}
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                placeholder={t("common.endDate")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("expense.expenseList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
            ) : expenses.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">{t("expense.noExpenses")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("expense.description")}</TableHead>
                    <TableHead>{t("budget.category")}</TableHead>
                    <TableHead>{t("expense.vendor")}</TableHead>
                    <TableHead>{t("donations.account")}</TableHead>
                    <TableHead className="text-right">{t("donations.amount")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.expense_date), "dd MMM yyyy", { locale: language === "fr" ? fr : undefined })}
                      </TableCell>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.category?.name || "-"}</TableCell>
                      <TableCell>{expense.vendor || "-"}</TableCell>
                      <TableCell>
                        {expense.cash_register ? (
                          <div className="flex items-center gap-1">
                            <Wallet className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{expense.cash_register.name}</span>
                          </div>
                        ) : expense.bank_account ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{expense.bank_account.name}</span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusLabel(expense.status).variant}>
                          {getStatusLabel(expense.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {expense.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary"
                                onClick={() => updateExpenseStatus.mutate({ id: expense.id, status: "approved" })}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => updateExpenseStatus.mutate({ id: expense.id, status: "rejected" })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Expense Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("expense.viewExpense")}</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.date")}</p>
                    <p className="font-medium">
                      {format(new Date(selectedExpense.expense_date), "dd MMMM yyyy", { locale: language === "fr" ? fr : undefined })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donations.amount")}</p>
                    <p className="font-medium text-lg">{formatCurrency(Number(selectedExpense.amount))}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("expense.description")}</p>
                  <p className="font-medium">{selectedExpense.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("budget.category")}</p>
                    <p className="font-medium">{selectedExpense.category?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("expense.vendor")}</p>
                    <p className="font-medium">{selectedExpense.vendor || "-"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donations.paymentMethod")}</p>
                    <p className="font-medium">{paymentMethods[selectedExpense.payment_method] || selectedExpense.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donations.account")}</p>
                    <p className="font-medium">
                      {selectedExpense.cash_register?.name || selectedExpense.bank_account?.name || "-"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("expense.referenceNumber")}</p>
                    <p className="font-medium">{selectedExpense.reference_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.status")}</p>
                    <Badge variant={getStatusLabel(selectedExpense.status).variant}>
                      {getStatusLabel(selectedExpense.status).label}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("members.branch")}</p>
                    <p className="font-medium">{selectedExpense.branch?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donations.creator")}</p>
                    <p className="font-medium">{getCreatorName(selectedExpense.created_by)}</p>
                  </div>
                </div>
                {selectedExpense.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("donations.notes")}</p>
                    <p className="font-medium">{selectedExpense.notes}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
