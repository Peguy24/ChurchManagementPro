import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import TransferDialog from "@/components/TransferDialog";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

const CashRegister = () => {
  const { t, language } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    branch_id: "",
    current_balance: "",
  });
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "income",
    amount: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    reference_number: "",
  });

  const { data: registers, isLoading } = useQuery({
    queryKey: ["cash-registers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*, branches(name), members(first_name, last_name)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("status", "active");
      return data || [];
    },
  });

  const { data: cashTransactions } = useQuery({
    queryKey: ["cash-transactions", selectedRegister],
    queryFn: async () => {
      if (!selectedRegister) return [];
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("*")
        .eq("cash_register_id", selectedRegister)
        .order("transaction_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRegister,
  });

  const createRegister = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cash_registers").insert({
        name: registerForm.name,
        branch_id: registerForm.branch_id && registerForm.branch_id !== "none" ? registerForm.branch_id : null,
        current_balance: registerForm.current_balance ? Number(registerForm.current_balance) : 0,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      setRegisterDialogOpen(false);
      setRegisterForm({ name: "", branch_id: "", current_balance: "" });
      toast({ title: t("common.save"), description: t("cashRegisterPage.successCreate") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("cashRegisterPage.errorCreate"), variant: "destructive" });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const amount = Number(transactionForm.amount);
      const isExpense = transactionForm.transaction_type === "expense" || transactionForm.transaction_type === "transfer_out";
      
      // Check sufficient balance for outgoing transactions
      if (isExpense) {
        const register = registers?.find((r) => r.id === selectedRegister);
        if (register && Number(register.current_balance) < Math.abs(amount)) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
      }

      const { error } = await supabase.from("cash_transactions").insert({
        cash_register_id: selectedRegister,
        transaction_type: transactionForm.transaction_type,
        amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
        description: transactionForm.description || null,
        transaction_date: transactionForm.transaction_date,
        reference_number: transactionForm.reference_number || null,
        tenant_id: tenantId,
      });
      if (error) throw error;

      const register = registers?.find((r) => r.id === selectedRegister);
      if (register) {
        const newBalance = Number(register.current_balance) + (isExpense ? -Math.abs(amount) : Math.abs(amount));
        await supabase.from("cash_registers").update({ current_balance: newBalance }).eq("id", selectedRegister);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      setTransactionDialogOpen(false);
      setTransactionForm({ transaction_type: "income", amount: "", description: "", transaction_date: format(new Date(), "yyyy-MM-dd"), reference_number: "" });
      toast({ title: t("common.save"), description: t("cashRegisterPage.successTransaction") });
    },
    onError: (error: any) => {
      const description = error?.message === "INSUFFICIENT_BALANCE" 
        ? t("cashRegisterPage.insufficientBalance") 
        : t("cashRegisterPage.errorTransaction");
      toast({ title: t("common.error"), description, variant: "destructive" });
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "income": return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "expense": return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      case "transfer_in":
      case "transfer_out": return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      income: t("cashRegisterPage.income"),
      expense: t("cashRegisterPage.expense"),
      transfer_in: t("cashRegisterPage.transferIn"),
      transfer_out: t("cashRegisterPage.transferOut"),
    };
    return labels[type] || type;
  };

  const totalBalance = registers?.reduce((sum, r) => sum + Number(r.current_balance || 0), 0) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t("cashRegisterPage.title")}</h1>
            <p className="text-muted-foreground">{t("cashRegisterPage.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <TransferDialog />
            <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />{t("cashRegisterPage.newRegister")}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("cashRegisterPage.createRegister")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("cashRegisterPage.registerName")} *</Label>
                  <Input
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    placeholder={t("cashRegisterPage.registerNamePlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("cashRegisterPage.branch")}</Label>
                  <Select value={registerForm.branch_id} onValueChange={(v) => setRegisterForm({ ...registerForm, branch_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("cashRegisterPage.allBranches")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("cashRegisterPage.allBranches")}</SelectItem>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("cashRegisterPage.initialBalance")}</Label>
                  <Input
                    type="number"
                    value={registerForm.current_balance}
                    onChange={(e) => setRegisterForm({ ...registerForm, current_balance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <Button onClick={() => createRegister.mutate()} disabled={!registerForm.name || createRegister.isPending}>
                  {createRegister.isPending ? t("cashRegisterPage.creating") : t("cashRegisterPage.createButton")}
                </Button>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">{t("cashRegisterPage.totalBalance")}</p>
                <p className="text-3xl font-bold text-green-700">{formatAmount(totalBalance)}</p>
              </div>
              <Wallet className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p>{t("cashRegisterPage.loading")}</p>
          ) : registers?.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">{t("cashRegisterPage.noRegisters")}</p>
          ) : (
            registers?.map((register) => (
              <Card 
                key={register.id} 
                className={`cursor-pointer transition-all ${selectedRegister === register.id ? "ring-2 ring-primary" : "hover:shadow-lg"}`}
                onClick={() => setSelectedRegister(register.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{register.name}</CardTitle>
                    </div>
                    <Badge variant={Number(register.current_balance) >= 0 ? "default" : "destructive"}>
                      {Number(register.current_balance) >= 0 ? t("cashRegisterPage.positive") : t("cashRegisterPage.negative")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className={`text-2xl font-bold ${Number(register.current_balance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatAmount(Number(register.current_balance))}
                    </p>
                    {(register.branches as any)?.name && (
                      <p className="text-sm text-muted-foreground">{t("cashRegisterPage.branchLabel")}: {(register.branches as any).name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selectedRegister && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("cashRegisterPage.transactions")} - {registers?.find((r) => r.id === selectedRegister)?.name}</CardTitle>
              <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("cashRegisterPage.addTransaction")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("cashRegisterPage.newTransaction")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t("cashRegisterPage.type")}</Label>
                      <Select value={transactionForm.transaction_type} onValueChange={(v) => setTransactionForm({ ...transactionForm, transaction_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">{t("cashRegisterPage.income")}</SelectItem>
                          <SelectItem value="expense">{t("cashRegisterPage.expense")}</SelectItem>
                          <SelectItem value="transfer_in">{t("cashRegisterPage.transferIn")}</SelectItem>
                          <SelectItem value="transfer_out">{t("cashRegisterPage.transferOut")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("cashRegisterPage.amount")} *</Label>
                      <Input
                        type="number"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("cashRegisterPage.description")}</Label>
                      <Input
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("cashRegisterPage.reference")}</Label>
                      <Input
                        value={transactionForm.reference_number}
                        onChange={(e) => setTransactionForm({ ...transactionForm, reference_number: e.target.value })}
                        placeholder={t("cashRegisterPage.referencePlaceholder")}
                      />
                    </div>
                    <div>
                      <Label>{t("cashRegisterPage.date")}</Label>
                      <Input
                        type="date"
                        value={transactionForm.transaction_date}
                        onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                      />
                    </div>
                    <Button onClick={() => createTransaction.mutate()} disabled={!transactionForm.amount || createTransaction.isPending}>
                      {t("cashRegisterPage.save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cashRegisterPage.date")}</TableHead>
                    <TableHead>{t("cashRegisterPage.type")}</TableHead>
                    <TableHead>{t("cashRegisterPage.description")}</TableHead>
                    <TableHead>{t("cashRegisterPage.reference")}</TableHead>
                    <TableHead className="text-right">{t("cashRegisterPage.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashTransactions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">{t("cashRegisterPage.noTransactions")}</TableCell>
                    </TableRow>
                  ) : (
                    cashTransactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.transaction_date), "dd/MM/yyyy", { locale: language === "fr" ? fr : undefined })}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {getTransactionIcon(tx.transaction_type)}
                            {getTransactionLabel(tx.transaction_type)}
                          </span>
                        </TableCell>
                        <TableCell>{tx.description || "-"}</TableCell>
                        <TableCell>{tx.reference_number || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${Number(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {Number(tx.amount) >= 0 ? "+" : ""}{formatAmount(Number(tx.amount))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default CashRegister;
