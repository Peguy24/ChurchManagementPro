import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, PiggyBank, ArrowUpRight, ArrowDownRight, Target } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

const SpecialFunds = () => {
  const { t, language } = useLanguage();

  const { tenantId } = useCurrentTenant();
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState({
    name: "",
    description: "",
    target_amount: "",
    start_date: "",
    end_date: "",
    branch_id: "",
  });
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "income",
    amount: "",
    description: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: funds, isLoading } = useQuery({
    queryKey: ["special-funds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_funds")
        .select("*, branches(name)")
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

  const { data: fundTransactions } = useQuery({
    queryKey: ["fund-transactions", selectedFund],
    queryFn: async () => {
      if (!selectedFund) return [];
      const { data, error } = await supabase
        .from("fund_transactions")
        .select("*")
        .eq("fund_id", selectedFund)
        .order("transaction_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFund,
  });

  const createFund = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("special_funds").insert({
        name: fundForm.name,
        description: fundForm.description || null,
        target_amount: fundForm.target_amount ? Number(fundForm.target_amount) : 0,
        start_date: fundForm.start_date || null,
        end_date: fundForm.end_date || null,
        branch_id: fundForm.branch_id && fundForm.branch_id !== "none" ? fundForm.branch_id : null,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-funds"] });
      setFundDialogOpen(false);
      setFundForm({ name: "", description: "", target_amount: "", start_date: "", end_date: "", branch_id: "" });
      toast({ title: t("common.save"), description: t("specialFundsPage.successCreate") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("specialFundsPage.errorCreate"), variant: "destructive" });
    },
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const amount = Number(transactionForm.amount);
      const { error } = await supabase.from("fund_transactions").insert({
        fund_id: selectedFund,
        transaction_type: transactionForm.transaction_type,
        amount: transactionForm.transaction_type === "expense" ? -Math.abs(amount) : Math.abs(amount),
        description: transactionForm.description || null,
        transaction_date: transactionForm.transaction_date,
        tenant_id: tenantId,
      });
      if (error) throw error;

      const fund = funds?.find((f) => f.id === selectedFund);
      if (fund) {
        const newAmount = Number(fund.current_amount) + 
          (transactionForm.transaction_type === "income" ? Math.abs(amount) : -Math.abs(amount));
        await supabase.from("special_funds").update({ current_amount: newAmount }).eq("id", selectedFund);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["special-funds"] });
      queryClient.invalidateQueries({ queryKey: ["fund-transactions"] });
      setTransactionDialogOpen(false);
      setTransactionForm({ transaction_type: "income", amount: "", description: "", transaction_date: format(new Date(), "yyyy-MM-dd") });
      toast({ title: t("common.save"), description: t("specialFundsPage.successTransaction") });
    },
    onError: () => {
      toast({ title: t("common.error"), description: t("specialFundsPage.errorTransaction"), variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      completed: "secondary",
      suspended: "destructive",
    };
    const labels: Record<string, string> = {
      active: t("specialFundsPage.active"),
      completed: t("specialFundsPage.completed"),
      suspended: t("specialFundsPage.suspended"),
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t("specialFundsPage.title")}</h1>
            <p className="text-muted-foreground">{t("specialFundsPage.subtitle")}</p>
          </div>
          <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />{t("specialFundsPage.newFund")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("specialFundsPage.createFund")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("specialFundsPage.fundName")} *</Label>
                  <Input
                    value={fundForm.name}
                    onChange={(e) => setFundForm({ ...fundForm, name: e.target.value })}
                    placeholder={t("specialFundsPage.fundNamePlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("specialFundsPage.description")}</Label>
                  <Textarea
                    value={fundForm.description}
                    onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("specialFundsPage.target")}</Label>
                  <Input
                    type="number"
                    value={fundForm.target_amount}
                    onChange={(e) => setFundForm({ ...fundForm, target_amount: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("specialFundsPage.startDate")}</Label>
                    <Input type="date" value={fundForm.start_date} onChange={(e) => setFundForm({ ...fundForm, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("specialFundsPage.endDate")}</Label>
                    <Input type="date" value={fundForm.end_date} onChange={(e) => setFundForm({ ...fundForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>{t("specialFundsPage.branch")}</Label>
                  <Select value={fundForm.branch_id} onValueChange={(v) => setFundForm({ ...fundForm, branch_id: v })}>
                    <SelectTrigger><SelectValue placeholder={t("specialFundsPage.allBranches")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("specialFundsPage.allBranches")}</SelectItem>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => createFund.mutate()} disabled={!fundForm.name || createFund.isPending}>
                  {createFund.isPending ? t("specialFundsPage.creating") : t("specialFundsPage.createButton")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p>{t("specialFundsPage.loading")}</p>
          ) : funds?.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">{t("specialFundsPage.noFunds")}</p>
          ) : (
            funds?.map((fund) => {
              const progress = fund.target_amount > 0 ? (Number(fund.current_amount) / Number(fund.target_amount)) * 100 : 0;
              return (
                <Card key={fund.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedFund(fund.id)}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{fund.name}</CardTitle>
                      </div>
                      {getStatusBadge(fund.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{fund.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("specialFundsPage.collected")}</span>
                        <span className="font-bold text-green-600">{formatAmount(Number(fund.current_amount))}</span>
                      </div>
                      {fund.target_amount > 0 && (
                        <>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progress.toFixed(0)}%</span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {formatAmount(Number(fund.target_amount))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {selectedFund && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("specialFundsPage.transactions")} - {funds?.find((f) => f.id === selectedFund)?.name}</CardTitle>
              <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />{t("specialFundsPage.addTransaction")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("specialFundsPage.newTransaction")}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>{t("specialFundsPage.type")}</Label>
                      <Select value={transactionForm.transaction_type} onValueChange={(v) => setTransactionForm({ ...transactionForm, transaction_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">{t("specialFundsPage.income")}</SelectItem>
                          <SelectItem value="expense">{t("specialFundsPage.expense")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t("specialFundsPage.amount")} *</Label>
                      <Input
                        type="number"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("specialFundsPage.description")}</Label>
                      <Input
                        value={transactionForm.description}
                        onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t("specialFundsPage.date")}</Label>
                      <Input
                        type="date"
                        value={transactionForm.transaction_date}
                        onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                      />
                    </div>
                    <Button onClick={() => createTransaction.mutate()} disabled={!transactionForm.amount || createTransaction.isPending}>
                      {t("specialFundsPage.save")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("specialFundsPage.date")}</TableHead>
                    <TableHead>{t("specialFundsPage.type")}</TableHead>
                    <TableHead>{t("specialFundsPage.description")}</TableHead>
                    <TableHead className="text-right">{t("specialFundsPage.amount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundTransactions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">{t("specialFundsPage.noTransactions")}</TableCell>
                    </TableRow>
                  ) : (
                    fundTransactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.transaction_date), "dd/MM/yyyy", { locale: language === "fr" ? fr : undefined })}</TableCell>
                        <TableCell>
                          {tx.transaction_type === "income" ? (
                            <span className="flex items-center text-green-600"><ArrowUpRight className="h-4 w-4 mr-1" />{t("specialFundsPage.income")}</span>
                          ) : (
                            <span className="flex items-center text-red-600"><ArrowDownRight className="h-4 w-4 mr-1" />{t("specialFundsPage.expense")}</span>
                          )}
                        </TableCell>
                        <TableCell>{tx.description || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${Number(tx.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatAmount(Math.abs(Number(tx.amount)))}
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

export default SpecialFunds;
