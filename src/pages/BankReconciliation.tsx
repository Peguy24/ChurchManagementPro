import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function BankReconciliation() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  // Fetch bank accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select(`*, branch:branches(name)`)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch transactions for selected account
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ["bank-transactions", selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return [];
      const { data, error } = await supabase
        .from("bank_transactions")
        .select(`
          *,
          donation:donations(id, amount, donation_type, member_id),
          expense:expenses(id, amount, description)
        `)
        .eq("bank_account_id", selectedAccount)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAccount,
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

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: "",
    account_number: "",
    bank_name: "",
    branch_id: "",
    current_balance: "",
  });

  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "income" as "income" | "expense",
    amount: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    reference_number: "",
  });

  // Create account mutation
  const createAccount = useMutation({
    mutationFn: async (data: typeof accountForm) => {
      const { error } = await supabase.from("bank_accounts").insert({
        name: data.name,
        account_number: data.account_number || null,
        bank_name: data.bank_name || null,
        branch_id: data.branch_id || null,
        current_balance: parseFloat(data.current_balance) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setAccountDialogOpen(false);
      setAccountForm({ name: "", account_number: "", bank_name: "", branch_id: "", current_balance: "" });
      toast({ title: t("common.save"), description: t("bank.accountCreated") });
    },
    onError: () => {
      toast({ title: t("errors.serverError"), variant: "destructive" });
    },
  });

  // Create transaction mutation
  const createTransaction = useMutation({
    mutationFn: async (data: typeof transactionForm) => {
      const { error } = await supabase.from("bank_transactions").insert({
        bank_account_id: selectedAccount,
        transaction_type: data.transaction_type,
        amount: parseFloat(data.amount),
        transaction_date: data.transaction_date,
        description: data.description || null,
        reference_number: data.reference_number || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      setTransactionDialogOpen(false);
      setTransactionForm({
        transaction_type: "income",
        amount: "",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        description: "",
        reference_number: "",
      });
      toast({ title: t("common.save"), description: t("bank.transactionCreated") });
    },
    onError: () => {
      toast({ title: t("errors.serverError"), variant: "destructive" });
    },
  });

  // Toggle reconciliation
  const toggleReconciliation = useMutation({
    mutationFn: async ({ id, reconciled }: { id: string; reconciled: boolean }) => {
      const { error } = await supabase
        .from("bank_transactions")
        .update({
          is_reconciled: reconciled,
          reconciled_at: reconciled ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast({ title: t("common.save") });
    },
  });

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name) {
      toast({ title: t("errors.required"), variant: "destructive" });
      return;
    }
    createAccount.mutate(accountForm);
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.amount) {
      toast({ title: t("errors.required"), variant: "destructive" });
      return;
    }
    createTransaction.mutate(transactionForm);
  };

  // Calculate statistics
  const selectedAccountData = accounts.find((a) => a.id === selectedAccount);
  const reconciledTransactions = transactions.filter((t) => t.is_reconciled);
  const unreconciledTransactions = transactions.filter((t) => !t.is_reconciled);

  const totalIncome = transactions
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("bank.title")}</h1>
            <p className="text-muted-foreground">{t("bank.subtitle")}</p>
          </div>
          <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("bank.addAccount")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("bank.addAccount")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("bank.accountName")} *</Label>
                  <Input
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="Ex: Compte Principal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("bank.accountNumber")}</Label>
                    <Input
                      value={accountForm.account_number}
                      onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                      placeholder="XXXX-XXXX-XXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("bank.bankName")}</Label>
                    <Input
                      value={accountForm.bank_name}
                      onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                      placeholder="Nom de la banque"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("bank.initialBalance")}</Label>
                    <Input
                      type="number"
                      value={accountForm.current_balance}
                      onChange={(e) => setAccountForm({ ...accountForm, current_balance: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("members.branch")}</Label>
                    <Select
                      value={accountForm.branch_id}
                      onValueChange={(v) => setAccountForm({ ...accountForm, branch_id: v === "none" ? "" : v })}
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
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createAccount.isPending}>
                    {t("common.save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingAccounts ? (
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : accounts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("bank.noAccounts")}
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card
                key={account.id}
                className={`cursor-pointer transition-all ${
                  selectedAccount === account.id ? "ring-2 ring-primary" : "hover:shadow-md"
                }`}
                onClick={() => setSelectedAccount(account.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                  </div>
                  {account.is_active && <Badge variant="outline">{t("common.active")}</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${Number(account.current_balance).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {account.bank_name || t("bank.notSpecified")}
                    {account.account_number && ` • ${account.account_number.slice(-4)}`}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Transactions Section */}
        {selectedAccount && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("bank.transactions")}</CardTitle>
                <CardDescription>
                  {selectedAccountData?.name} - {t("bank.reconciliationStatus")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {t("bank.addTransaction")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("bank.addTransaction")}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleTransactionSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("bank.transactionType")}</Label>
                          <Select
                            value={transactionForm.transaction_type}
                            onValueChange={(v: "income" | "expense") =>
                              setTransactionForm({ ...transactionForm, transaction_type: v })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">{t("bank.income")}</SelectItem>
                              <SelectItem value="expense">{t("bank.expense")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("donations.amount")} *</Label>
                          <Input
                            type="number"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t("common.date")}</Label>
                          <Input
                            type="date"
                            value={transactionForm.transaction_date}
                            onChange={(e) =>
                              setTransactionForm({ ...transactionForm, transaction_date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("expense.referenceNumber")}</Label>
                          <Input
                            value={transactionForm.reference_number}
                            onChange={(e) =>
                              setTransactionForm({ ...transactionForm, reference_number: e.target.value })
                            }
                            placeholder="N° de référence"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("expense.description")}</Label>
                        <Input
                          value={transactionForm.description}
                          onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                          placeholder="Description de la transaction"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setTransactionDialogOpen(false)}>
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={createTransaction.isPending}>
                          {t("common.save")}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("bank.totalIncome")}</p>
                  <p className="text-xl font-bold text-primary">${totalIncome.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("bank.totalExpense")}</p>
                  <p className="text-xl font-bold text-destructive">${totalExpense.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("bank.reconciled")}</p>
                  <p className="text-xl font-bold">{reconciledTransactions.length}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{t("bank.pending")}</p>
                  <p className="text-xl font-bold text-yellow-600">{unreconciledTransactions.length}</p>
                </div>
              </div>

              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
                  <TabsTrigger value="pending">{t("bank.toReconcile")}</TabsTrigger>
                  <TabsTrigger value="reconciled">{t("bank.reconciled")}</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <TransactionTable
                    transactions={transactions}
                    language={language}
                    t={t}
                    onToggleReconcile={(id, reconciled) => toggleReconciliation.mutate({ id, reconciled })}
                  />
                </TabsContent>
                <TabsContent value="pending">
                  <TransactionTable
                    transactions={unreconciledTransactions}
                    language={language}
                    t={t}
                    onToggleReconcile={(id, reconciled) => toggleReconciliation.mutate({ id, reconciled })}
                  />
                </TabsContent>
                <TabsContent value="reconciled">
                  <TransactionTable
                    transactions={reconciledTransactions}
                    language={language}
                    t={t}
                    onToggleReconcile={(id, reconciled) => toggleReconciliation.mutate({ id, reconciled })}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

interface TransactionTableProps {
  transactions: any[];
  language: string;
  t: (key: string) => string;
  onToggleReconcile: (id: string, reconciled: boolean) => void;
}

function TransactionTable({ transactions, language, t, onToggleReconcile }: TransactionTableProps) {
  if (transactions.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">{t("bank.noTransactions")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("common.date")}</TableHead>
          <TableHead>{t("bank.transactionType")}</TableHead>
          <TableHead>{t("expense.description")}</TableHead>
          <TableHead>{t("expense.referenceNumber")}</TableHead>
          <TableHead className="text-right">{t("donations.amount")}</TableHead>
          <TableHead>{t("common.status")}</TableHead>
          <TableHead>{t("common.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell>
              {format(new Date(tx.transaction_date), "dd MMM yyyy", { locale: language === "fr" ? fr : undefined })}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {tx.transaction_type === "income" ? (
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                {tx.transaction_type === "income" ? t("bank.income") : t("bank.expense")}
              </div>
            </TableCell>
            <TableCell>{tx.description || "-"}</TableCell>
            <TableCell>{tx.reference_number || "-"}</TableCell>
            <TableCell className="text-right font-medium">
              <span className={tx.transaction_type === "income" ? "text-primary" : "text-destructive"}>
                {tx.transaction_type === "income" ? "+" : "-"}
                ${Number(tx.amount).toLocaleString()}
              </span>
            </TableCell>
            <TableCell>
              {tx.is_reconciled ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {t("bank.reconciled")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {t("bank.pending")}
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onToggleReconcile(tx.id, !tx.is_reconciled)}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {tx.is_reconciled ? t("bank.unreconcile") : t("bank.reconcile")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
