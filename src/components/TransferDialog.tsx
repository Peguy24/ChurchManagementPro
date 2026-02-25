import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

type AccountType = "cash_register" | "bank_account";

interface TransferDialogProps {
  trigger?: React.ReactNode;
}

const TransferDialog = ({ trigger }: TransferDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sourceType: "cash_register" as AccountType,
    sourceId: "",
    destinationType: "bank_account" as AccountType,
    destinationId: "",
    amount: "",
    description: "",
    reference_number: "",
    transfer_date: format(new Date(), "yyyy-MM-dd"),
  });

  const { data: cashRegisters } = useQuery({
    queryKey: ["cash-registers-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_registers")
        .select("id, name, current_balance")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bank_accounts")
        .select("id, name, current_balance, bank_name")
        .eq("is_active", true);
      return data || [];
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (amount <= 0) throw new Error("Montant invalide");

      const referenceNumber = form.reference_number || `TRF-${Date.now()}`;
      const description = form.description || "Transfert de fonds";

      // Get source and destination names for description
      let sourceName = "";
      let destName = "";

      if (form.sourceType === "cash_register") {
        sourceName = cashRegisters?.find(r => r.id === form.sourceId)?.name || "Caisse";
      } else {
        sourceName = bankAccounts?.find(a => a.id === form.sourceId)?.name || "Compte";
      }

      if (form.destinationType === "cash_register") {
        destName = cashRegisters?.find(r => r.id === form.destinationId)?.name || "Caisse";
      } else {
        destName = bankAccounts?.find(a => a.id === form.destinationId)?.name || "Compte";
      }

      const fullDescription = `${description} - De: ${sourceName} → Vers: ${destName}`;

      // 1. Record outgoing transaction from source
      if (form.sourceType === "cash_register") {
        const { error } = await supabase.from("cash_transactions").insert({
          cash_register_id: form.sourceId,
          transaction_type: "transfer_out",
          amount: -Math.abs(amount),
          description: fullDescription,
          reference_number: referenceNumber,
          transaction_date: form.transfer_date,
          tenant_id: tenantId,
        });
        if (error) throw error;

        // Update cash register balance
        const register = cashRegisters?.find(r => r.id === form.sourceId);
        if (register) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(register.current_balance) - amount })
            .eq("id", form.sourceId);
        }
      } else {
        const { error } = await supabase.from("bank_transactions").insert({
          bank_account_id: form.sourceId,
          transaction_type: "expense",
          amount: amount,
          description: fullDescription,
          reference_number: referenceNumber,
          transaction_date: form.transfer_date,
        });
        if (error) throw error;

        // Update bank account balance
        const account = bankAccounts?.find(a => a.id === form.sourceId);
        if (account) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: Number(account.current_balance) - amount })
            .eq("id", form.sourceId);
        }
      }

      // 2. Record incoming transaction to destination
      if (form.destinationType === "cash_register") {
        const { error } = await supabase.from("cash_transactions").insert({
          cash_register_id: form.destinationId,
          transaction_type: "transfer_in",
          amount: Math.abs(amount),
          description: fullDescription,
          reference_number: referenceNumber,
          transaction_date: form.transfer_date,
          tenant_id: tenantId,
        });
        if (error) throw error;

        // Update cash register balance
        const register = cashRegisters?.find(r => r.id === form.destinationId);
        if (register) {
          await supabase
            .from("cash_registers")
            .update({ current_balance: Number(register.current_balance) + amount })
            .eq("id", form.destinationId);
        }
      } else {
        const { error } = await supabase.from("bank_transactions").insert({
          bank_account_id: form.destinationId,
          transaction_type: "income",
          amount: amount,
          description: fullDescription,
          reference_number: referenceNumber,
          transaction_date: form.transfer_date,
        });
        if (error) throw error;

        // Update bank account balance
        const account = bankAccounts?.find(a => a.id === form.destinationId);
        if (account) {
          await supabase
            .from("bank_accounts")
            .update({ current_balance: Number(account.current_balance) + amount })
            .eq("id", form.destinationId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers-active"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts-active"] });
      setOpen(false);
      setForm({
        sourceType: "cash_register",
        sourceId: "",
        destinationType: "bank_account",
        destinationId: "",
        amount: "",
        description: "",
        reference_number: "",
        transfer_date: format(new Date(), "yyyy-MM-dd"),
      });
      toast({ title: "Succès", description: "Transfert effectué avec succès" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erreur", 
        description: error.message || "Impossible d'effectuer le transfert", 
        variant: "destructive" 
      });
    },
  });

  const getSourceAccounts = () => {
    if (form.sourceType === "cash_register") {
      return cashRegisters?.filter(r => 
        form.destinationType !== "cash_register" || r.id !== form.destinationId
      ) || [];
    }
    return bankAccounts?.filter(a => 
      form.destinationType !== "bank_account" || a.id !== form.destinationId
    ) || [];
  };

  const getDestinationAccounts = () => {
    if (form.destinationType === "cash_register") {
      return cashRegisters?.filter(r => 
        form.sourceType !== "cash_register" || r.id !== form.sourceId
      ) || [];
    }
    return bankAccounts?.filter(a => 
      form.sourceType !== "bank_account" || a.id !== form.sourceId
    ) || [];
  };

  const getSourceBalance = () => {
    if (!form.sourceId) return null;
    if (form.sourceType === "cash_register") {
      return cashRegisters?.find(r => r.id === form.sourceId)?.current_balance;
    }
    return bankAccounts?.find(a => a.id === form.sourceId)?.current_balance;
  };

  const sourceBalance = getSourceBalance();
  const isValidTransfer = form.sourceId && form.destinationId && 
    Number(form.amount) > 0 && 
    (sourceBalance === null || Number(form.amount) <= Number(sourceBalance));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transfert
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Transfert entre comptes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Source */}
          <div className="p-4 border rounded-lg bg-red-50/50 space-y-3">
            <Label className="text-sm font-medium text-red-700">Source (débit)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={form.sourceType} 
                onValueChange={(v: AccountType) => setForm({ ...form, sourceType: v, sourceId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_register">Caisse</SelectItem>
                  <SelectItem value="bank_account">Compte bancaire</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={form.sourceId} 
                onValueChange={(v) => setForm({ ...form, sourceId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {getSourceAccounts().map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (${Number(account.current_balance).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sourceBalance !== null && (
              <p className="text-xs text-muted-foreground">
                Solde disponible: <span className="font-medium">${Number(sourceBalance).toFixed(2)}</span>
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="p-2 bg-primary/10 rounded-full">
              <ArrowLeftRight className="h-5 w-5 text-primary rotate-90" />
            </div>
          </div>

          {/* Destination */}
          <div className="p-4 border rounded-lg bg-green-50/50 space-y-3">
            <Label className="text-sm font-medium text-green-700">Destination (crédit)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select 
                value={form.destinationType} 
                onValueChange={(v: AccountType) => setForm({ ...form, destinationType: v, destinationId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_register">Caisse</SelectItem>
                  <SelectItem value="bank_account">Compte bancaire</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={form.destinationId} 
                onValueChange={(v) => setForm({ ...form, destinationId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {getDestinationAccounts().map((account: any) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} (${Number(account.current_balance).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <Label>Montant ($) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
            {Number(form.amount) > Number(sourceBalance || 0) && sourceBalance !== null && (
              <p className="text-xs text-destructive mt-1">Le montant dépasse le solde disponible</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label>Motif du transfert</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Dépôt en banque, approvisionnement caisse..."
              rows={2}
            />
          </div>

          {/* Reference */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Référence</Label>
              <Input
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                placeholder="N° bordereau..."
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.transfer_date}
                onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
              />
            </div>
          </div>

          <Button 
            onClick={() => transferMutation.mutate()} 
            disabled={!isValidTransfer || transferMutation.isPending}
            className="w-full"
          >
            {transferMutation.isPending ? "Transfert en cours..." : "Effectuer le transfert"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;
