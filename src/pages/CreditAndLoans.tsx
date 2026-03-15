import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useToast } from "@/hooks/use-toast";
import { Plus, Handshake, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { format } from "date-fns";

type OperationType = "credit_purchase" | "loan_received" | "loan_given";

const CreditAndLoans = () => {
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<OperationType>("credit_purchase");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);

  const [form, setForm] = useState({
    counterparty: "",
    description: "",
    total_amount: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    due_date: "",
    interest_rate: "0",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "",
    notes: "",
    source_type: "" as "" | "cash_register" | "bank_account",
    source_id: "",
  });

  const { data: operations, isLoading } = useQuery({
    queryKey: ["credit-operations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_operations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: cashRegisters } = useQuery({
    queryKey: ["cash-registers-active", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id, name, current_balance")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-active", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, current_balance")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: payments } = useQuery({
    queryKey: ["credit-payments", selectedOperation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_payments")
        .select("*")
        .eq("credit_operation_id", selectedOperation.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOperation?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("credit_operations").insert({
        tenant_id: tenantId!,
        type: activeTab,
        counterparty: form.counterparty,
        description: form.description,
        total_amount: Number(form.total_amount),
        start_date: form.start_date,
        due_date: form.due_date || null,
        interest_rate: Number(form.interest_rate),
        notes: form.notes || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-operations"] });
      setCreateOpen(false);
      setForm({ counterparty: "", description: "", total_amount: "", start_date: format(new Date(), "yyyy-MM-dd"), due_date: "", interest_rate: "0", notes: "" });
      toast({ title: t("creditAndLoans.operationCreated") });
    },
    onError: () => {
      toast({ title: t("common.error"), variant: "destructive" });
    },
  });

  const getEffectiveTotal = (op: any) => {
    const total = Number(op.total_amount);
    const rate = Number(op.interest_rate || 0);
    return total + (total * rate / 100);
  };

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const effectiveTotal = getEffectiveTotal(selectedOperation);
      const remaining = effectiveTotal - Number(selectedOperation.amount_paid);
      const payAmount = Number(paymentForm.amount);
      if (payAmount > remaining) {
        throw new Error("EXCEEDS_REMAINING");
      }

      // Determine if this is outgoing (church pays) or incoming (church receives)
      const isOutgoing = selectedOperation.type === "credit_purchase" || selectedOperation.type === "loan_received";

      // Validate balance for outgoing payments
      if (isOutgoing && paymentForm.source_type && paymentForm.source_id) {
        if (paymentForm.source_type === "cash_register") {
          const reg = cashRegisters?.find((r) => r.id === paymentForm.source_id);
          if (reg && payAmount > Number(reg.current_balance || 0)) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        } else if (paymentForm.source_type === "bank_account") {
          const acc = bankAccounts?.find((a) => a.id === paymentForm.source_id);
          if (acc && payAmount > Number(acc.current_balance || 0)) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        }
      }

      // 1. Record the credit payment
      const { error } = await supabase.from("credit_payments").insert({
        credit_operation_id: selectedOperation.id,
        tenant_id: tenantId!,
        amount: payAmount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method || null,
        notes: paymentForm.notes || null,
        created_by: user!.id,
      });
      if (error) throw error;

      // 2. Update source balance
      if (paymentForm.source_type === "cash_register" && paymentForm.source_id) {
        const balanceChange = isOutgoing ? -payAmount : payAmount;
        const reg = cashRegisters?.find((r) => r.id === paymentForm.source_id);
        const newBalance = Number(reg?.current_balance || 0) + balanceChange;

        const { error: updateErr } = await supabase
          .from("cash_registers")
          .update({ current_balance: newBalance })
          .eq("id", paymentForm.source_id);
        if (updateErr) throw updateErr;

        // Record cash transaction
        const { error: txErr } = await supabase.from("cash_transactions").insert({
          cash_register_id: paymentForm.source_id,
          tenant_id: tenantId!,
          amount: payAmount,
          transaction_type: isOutgoing ? "expense" : "income",
          transaction_date: paymentForm.payment_date,
          description: `${isOutgoing ? "Paiement" : "Remboursement"}: ${selectedOperation.counterparty} - ${selectedOperation.description}`,
          created_by: user!.id,
        });
        if (txErr) throw txErr;
      } else if (paymentForm.source_type === "bank_account" && paymentForm.source_id) {
        const balanceChange = isOutgoing ? -payAmount : payAmount;
        const acc = bankAccounts?.find((a) => a.id === paymentForm.source_id);
        const newBalance = Number(acc?.current_balance || 0) + balanceChange;

        const { error: updateErr } = await supabase
          .from("bank_accounts")
          .update({ current_balance: newBalance })
          .eq("id", paymentForm.source_id);
        if (updateErr) throw updateErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-operations"] });
      queryClient.invalidateQueries({ queryKey: ["credit-payments"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers-active"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-active"] });
      setPaymentOpen(false);
      setPaymentForm({ amount: "", payment_date: format(new Date(), "yyyy-MM-dd"), payment_method: "", notes: "", source_type: "", source_id: "" });
      const isOutgoing = selectedOperation?.type === "credit_purchase" || selectedOperation?.type === "loan_received";
      toast({ title: t("creditAndLoans.paymentRecorded"), description: isOutgoing ? t("creditAndLoans.balanceDeducted") : t("creditAndLoans.balanceAdded") });
    },
    onError: (err: any) => {
      let desc = t("common.error");
      if (err?.message === "EXCEEDS_REMAINING") desc = t("creditAndLoans.exceedsRemaining");
      if (err?.message === "INSUFFICIENT_BALANCE") desc = t("creditAndLoans.insufficientBalance");
      toast({ title: t("common.error"), description: desc, variant: "destructive" });
    },
  });

  const filtered = operations?.filter((o) => o.type === activeTab) || [];

  const totalDebts = operations?.filter((o) => (o.type === "credit_purchase" || o.type === "loan_received") && o.status === "active")
    .reduce((s, o) => s + (getEffectiveTotal(o) - Number(o.amount_paid)), 0) || 0;

  const totalCredits = operations?.filter((o) => o.type === "loan_given" && o.status === "active")
    .reduce((s, o) => s + (getEffectiveTotal(o) - Number(o.amount_paid)), 0) || 0;

  const statusBadge = (status: string) => {
    if (status === "completed") return <Badge className="bg-green-100 text-green-800">{t("creditAndLoans.statusCompleted")}</Badge>;
    if (status === "cancelled") return <Badge variant="secondary">{t("creditAndLoans.statusCancelled")}</Badge>;
    return <Badge className="bg-orange-100 text-orange-800">{t("creditAndLoans.statusActive")}</Badge>;
  };

  const selectedSourceBalance = (() => {
    if (!paymentForm.source_type || !paymentForm.source_id) return null;
    if (paymentForm.source_type === "cash_register") {
      return cashRegisters?.find((r) => r.id === paymentForm.source_id)?.current_balance ?? null;
    }
    return bankAccounts?.find((a) => a.id === paymentForm.source_id)?.current_balance ?? null;
  })();

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("creditAndLoans.title")}</h1>
            <p className="text-muted-foreground">{t("creditAndLoans.subtitle")}</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />{t("creditAndLoans.newOperation")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("creditAndLoans.createOperation")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("creditAndLoans.counterparty")}</Label>
                  <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} placeholder={t("creditAndLoans.counterpartyPlaceholder")} />
                </div>
                <div>
                  <Label>{t("creditAndLoans.description")}</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("creditAndLoans.totalAmount")}</Label>
                    <Input type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("creditAndLoans.interestRate")}</Label>
                    <Input type="number" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("creditAndLoans.startDate")}</Label>
                    <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("creditAndLoans.dueDate")}</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("creditAndLoans.notes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!form.counterparty || !form.description || !form.total_amount || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("creditAndLoans.totalDebts")}</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatAmount(totalDebts)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("creditAndLoans.totalCredits")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatAmount(totalCredits)}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("creditAndLoans.activeOperations")}</CardTitle>
              <Handshake className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {operations?.filter((o) => o.status === "active").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credit_purchase">{t("creditAndLoans.creditPurchases")}</TabsTrigger>
            <TabsTrigger value="loan_received">{t("creditAndLoans.loansReceived")}</TabsTrigger>
            <TabsTrigger value="loan_given">{t("creditAndLoans.loansGiven")}</TabsTrigger>
          </TabsList>

          {["credit_purchase", "loan_received", "loan_given"].map((type) => (
            <TabsContent key={type} value={type}>
              <Card>
                <CardContent className="pt-6">
                  {isLoading ? (
                    <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">{t("creditAndLoans.noOperations")}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                         <TableRow>
                          <TableHead>{t("creditAndLoans.counterparty")}</TableHead>
                          <TableHead>{t("creditAndLoans.description")}</TableHead>
                          <TableHead>{t("creditAndLoans.totalAmount")}</TableHead>
                          <TableHead>{t("creditAndLoans.interestRate")}</TableHead>
                          <TableHead>{t("creditAndLoans.totalWithInterest")}</TableHead>
                          <TableHead>{t("creditAndLoans.paid")}</TableHead>
                          <TableHead>{t("creditAndLoans.remaining")}</TableHead>
                          <TableHead>{t("creditAndLoans.progress")}</TableHead>
                          <TableHead>{t("creditAndLoans.dueDate")}</TableHead>
                          <TableHead>{t("creditAndLoans.status")}</TableHead>
                          <TableHead>{t("creditAndLoans.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((op) => {
                          const effTotal = getEffectiveTotal(op);
                          const remaining = effTotal - Number(op.amount_paid);
                          const pct = effTotal > 0 ? (Number(op.amount_paid) / effTotal) * 100 : 0;
                          return (
                            <TableRow key={op.id}>
                              <TableCell className="font-medium">{op.counterparty}</TableCell>
                              <TableCell>{op.description}</TableCell>
                              <TableCell>{formatAmount(Number(op.total_amount))}</TableCell>
                              <TableCell>{Number(op.interest_rate || 0)}%</TableCell>
                              <TableCell className="font-semibold">{formatAmount(effTotal)}</TableCell>
                              <TableCell>{formatAmount(Number(op.amount_paid))}</TableCell>
                              <TableCell className="font-semibold">{formatAmount(remaining)}</TableCell>
                              <TableCell className="w-32">
                                <Progress value={pct} className="h-2" />
                                <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                              </TableCell>
                              <TableCell>{op.due_date || "-"}</TableCell>
                              <TableCell>{statusBadge(op.status)}</TableCell>
                              <TableCell>
                                {op.status === "active" && (
                                  <Button size="sm" variant="outline" onClick={() => { setSelectedOperation(op); setPaymentOpen(true); }}>
                                    <DollarSign className="h-3 w-3 mr-1" />{t("creditAndLoans.recordPayment")}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("creditAndLoans.recordPayment")}</DialogTitle>
            </DialogHeader>
            {selectedOperation && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border bg-muted/50">
                  <p className="font-medium">{selectedOperation.counterparty}</p>
                  <p className="text-sm text-muted-foreground">{selectedOperation.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("creditAndLoans.totalAmount")}: {formatAmount(Number(selectedOperation.total_amount))} | {t("creditAndLoans.interestRate")}: {Number(selectedOperation.interest_rate || 0)}%
                  </p>
                  <p className="text-sm mt-1">
                    {t("creditAndLoans.totalWithInterest")}: <span className="font-semibold">{formatAmount(getEffectiveTotal(selectedOperation))}</span>
                  </p>
                  <p className="text-sm">
                    {t("creditAndLoans.remaining")}: <span className="font-bold">{formatAmount(getEffectiveTotal(selectedOperation) - Number(selectedOperation.amount_paid))}</span>
                  </p>
                </div>
                <div>
                  <Label>{t("creditAndLoans.paymentAmount")}</Label>
                  <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                </div>
                <div>
                  <Label>{t("creditAndLoans.paymentDate")}</Label>
                  <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                </div>
                <div>
                  <Label>{t("creditAndLoans.paymentMethod")}</Label>
                  <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                    <SelectTrigger><SelectValue placeholder={t("creditAndLoans.selectMethod")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{t("creditAndLoans.cash")}</SelectItem>
                      <SelectItem value="bank_transfer">{t("creditAndLoans.bankTransfer")}</SelectItem>
                      <SelectItem value="check">{t("creditAndLoans.check")}</SelectItem>
                      <SelectItem value="mobile">{t("creditAndLoans.mobile")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Source */}
                <div>
                  <Label>{t("creditAndLoans.paymentSource")}</Label>
                  <Select value={paymentForm.source_type} onValueChange={(v) => setPaymentForm({ ...paymentForm, source_type: v as any, source_id: "" })}>
                    <SelectTrigger><SelectValue placeholder={t("creditAndLoans.selectSource")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_register">{t("creditAndLoans.cashRegisterSource")}</SelectItem>
                      <SelectItem value="bank_account">{t("creditAndLoans.bankAccountSource")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentForm.source_type === "cash_register" && (
                  <div>
                    <Select value={paymentForm.source_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, source_id: v })}>
                      <SelectTrigger><SelectValue placeholder={t("creditAndLoans.selectCashRegister")} /></SelectTrigger>
                      <SelectContent>
                        {cashRegisters?.map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.name} ({formatAmount(Number(r.current_balance || 0))})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentForm.source_type === "bank_account" && (
                  <div>
                    <Select value={paymentForm.source_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, source_id: v })}>
                      <SelectTrigger><SelectValue placeholder={t("creditAndLoans.selectBankAccount")} /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts?.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} ({formatAmount(Number(a.current_balance || 0))})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedSourceBalance !== null && (
                  <p className="text-sm text-muted-foreground">
                    {t("transferDialog.availableBalance")}: <span className="font-semibold">{formatAmount(Number(selectedSourceBalance))}</span>
                  </p>
                )}

                <div>
                  <Label>{t("creditAndLoans.notes")}</Label>
                  <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
                </div>
                <Button
                  onClick={() => paymentMutation.mutate()}
                  disabled={!paymentForm.amount || !paymentForm.source_type || !paymentForm.source_id || paymentMutation.isPending}
                  className="w-full"
                >
                  {paymentMutation.isPending ? t("common.saving") : t("creditAndLoans.confirmPayment")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CreditAndLoans;
