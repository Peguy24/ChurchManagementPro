import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Building2 } from "lucide-react";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useCurrency } from "@/hooks/useCurrency";

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDonation?: any;
}

export default function DonationDialog({
  open,
  onOpenChange,
  editDonation,
}: DonationDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useCurrentTenant();
  const { currencyCode, currencySymbol } = useCurrency();
  const [formData, setFormData] = useState({
    memberId: "none",
    amount: "",
    donationType: "",
    paymentMethod: "",
    donationDate: new Date().toISOString().split("T")[0],
    notes: "",
    branchId: "none",
    description: "",
    accountType: "cash" as "cash" | "bank",
    cashRegisterId: "none",
    bankAccountId: "none",
  });

  useEffect(() => {
    if (editDonation) {
      setFormData({
        memberId: editDonation.member_id || "none",
        amount: String(editDonation.amount),
        donationType: editDonation.donation_type || "",
        paymentMethod: editDonation.payment_method || "",
        donationDate: editDonation.donation_date,
        notes: editDonation.notes || "",
        branchId: editDonation.branch_id || "none",
        description: editDonation.description || "",
        accountType: editDonation.bank_account_id ? "bank" : "cash",
        cashRegisterId: editDonation.cash_register_id || "none",
        bankAccountId: editDonation.bank_account_id || "none",
      });
    } else {
      setFormData({
        memberId: "none",
        amount: "",
        donationType: "",
        paymentMethod: "",
        donationDate: new Date().toISOString().split("T")[0],
        notes: "",
        branchId: "none",
        description: "",
        accountType: "cash",
        cashRegisterId: "none",
        bankAccountId: "none",
      });
    }
  }, [editDonation, open]);

  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: cashRegisters } = useQuery({
    queryKey: ["cash-registers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id, name, current_balance")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ["bank-accounts-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name, current_balance")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: incomeCategories } = useQuery({
    queryKey: ["income-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("income_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const createDonation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const amount = parseFloat(data.amount);
      
      const donationData = {
        member_id: data.memberId === "none" ? null : data.memberId,
        amount: amount,
        donation_type: data.donationType,
        payment_method: data.paymentMethod,
        donation_date: data.donationDate,
        notes: data.notes || null,
        branch_id: data.branchId === "none" ? null : data.branchId,
        description: data.description || null,
        cash_register_id: data.accountType === "cash" && data.cashRegisterId !== "none" ? data.cashRegisterId : null,
        bank_account_id: data.accountType === "bank" && data.bankAccountId !== "none" ? data.bankAccountId : null,
        created_by: user.user?.id,
        tenant_id: tenantId,
      };

      if (editDonation) {
        const { error } = await supabase
          .from("donations")
          .update(donationData)
          .eq("id", editDonation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("donations").insert(donationData);
        if (error) throw error;
      }

      // Update account balance
      if (data.accountType === "cash" && data.cashRegisterId !== "none") {
        const register = cashRegisters?.find(r => r.id === data.cashRegisterId);
        if (register) {
          const oldAmount = editDonation?.cash_register_id === data.cashRegisterId ? Number(editDonation.amount) : 0;
          const newBalance = Number(register.current_balance) - oldAmount + amount;
          await supabase.from("cash_registers").update({ current_balance: newBalance }).eq("id", data.cashRegisterId);
          
          // Add cash transaction
          if (!editDonation) {
            await supabase.from("cash_transactions").insert({
              cash_register_id: data.cashRegisterId,
              transaction_type: "income",
              amount: amount,
              description: data.description || `Recette: ${data.donationType}`,
              transaction_date: data.donationDate,
              tenant_id: tenantId,
            });
          }
        }
      }

      if (data.accountType === "bank" && data.bankAccountId !== "none") {
        const account = bankAccounts?.find(a => a.id === data.bankAccountId);
        if (account) {
          const oldAmount = editDonation?.bank_account_id === data.bankAccountId ? Number(editDonation.amount) : 0;
          const newBalance = Number(account.current_balance) - oldAmount + amount;
          await supabase.from("bank_accounts").update({ current_balance: newBalance }).eq("id", data.bankAccountId);
          
          // Add bank transaction
          if (!editDonation) {
            await supabase.from("bank_transactions").insert({
              bank_account_id: data.bankAccountId,
              transaction_type: "income",
              amount: amount,
              description: data.description || `Recette: ${data.donationType}`,
              transaction_date: data.donationDate,
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast({
        title: editDonation ? t("donations.editIncome") : t("donations.addDonation"),
        description: t("common.save"),
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t("errors.serverError"),
        description: t("errors.serverError"),
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.donationType || !formData.paymentMethod || !formData.amount) {
      toast({
        title: t("errors.serverError"),
        description: t("errors.required"),
        variant: "destructive",
      });
      return;
    }
    
    createDonation.mutate(formData);
  };

  const donationTypes = [
    { value: "tithe", label: t("donations.tithe") },
    { value: "offering", label: t("donations.offering") },
    { value: "special", label: t("donations.special") },
    { value: "activity", label: t("donations.activity") },
    { value: "other", label: t("donations.other") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editDonation ? t("donations.editIncome") : t("donations.addDonation")}</DialogTitle>
          <DialogDescription>
            {t("donations.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date - Required */}
          <div className="space-y-2">
            <Label htmlFor="donationDate">{t("donations.donationDate")} *</Label>
            <Input
              id="donationDate"
              type="date"
              value={formData.donationDate}
              onChange={(e) => setFormData({ ...formData, donationDate: e.target.value })}
              required
            />
          </div>

          {/* Amount - Required */}
          <div className="space-y-2">
            <Label htmlFor="amount">{t("donations.amount")} ({currencyCode}) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          {/* Category/Type - Required */}
          <div className="space-y-2">
            <Label>{t("donations.donationType")} *</Label>
            <Select
              value={formData.donationType || undefined}
              onValueChange={(value) => setFormData({ ...formData, donationType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("donations.selectType")} />
              </SelectTrigger>
              <SelectContent>
                {donationTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method - Required */}
          <div className="space-y-2">
            <Label>{t("donations.paymentMethod")} *</Label>
            <Select
              value={formData.paymentMethod || undefined}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("donations.paymentMethod")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("donations.cash")}</SelectItem>
                <SelectItem value="check">{t("donations.check")}</SelectItem>
                <SelectItem value="transfer">{t("donations.transfer")}</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">{t("donations.card")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Account Type - Required */}
          <div className="space-y-2">
            <Label>Compte de destination *</Label>
            <RadioGroup
              value={formData.accountType}
              onValueChange={(value: "cash" | "bank") => setFormData({ ...formData, accountType: value })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-1 cursor-pointer">
                  <Wallet className="h-4 w-4" />
                  Caisse
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank" id="bank" />
                <Label htmlFor="bank" className="flex items-center gap-1 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Banque
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cash Register or Bank Account Selection */}
          {formData.accountType === "cash" ? (
            <div className="space-y-2">
              <Label>Caisse *</Label>
              <Select
                value={formData.cashRegisterId}
                onValueChange={(value) => setFormData({ ...formData, cashRegisterId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la caisse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non spécifié</SelectItem>
                  {cashRegisters?.map((register) => (
                    <SelectItem key={register.id} value={register.id}>
                      {register.name} (Solde: {Number(register.current_balance).toLocaleString()} {currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Compte bancaire *</Label>
              <Select
                value={formData.bankAccountId}
                onValueChange={(value) => setFormData({ ...formData, bankAccountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le compte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non spécifié</SelectItem>
                  {bankAccounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {account.bank_name} (Solde: {Number(account.current_balance).toLocaleString()} {currencyCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description - Required */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Offrande culte dominical"
              required
            />
          </div>

          {/* Member - Optional */}
          <div className="space-y-2">
            <Label>{t("attendance.selectMember")} (Optionnel)</Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) => setFormData({ ...formData, memberId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("attendance.selectMember")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Anonyme</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch - Optional */}
          <div className="space-y-2">
            <Label>{t("branches.branchName")}</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) => setFormData({ ...formData, branchId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("branches.branchName")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Toutes les branches</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes - Optional */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("donations.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createDonation.isPending}>
              {createDonation.isPending ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
