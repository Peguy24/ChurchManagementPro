import { useState } from "react";
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

interface DonationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DonationDialog({
  open,
  onOpenChange,
}: DonationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<{
    memberId: string;
    amount: string;
    donationType: string;
    paymentMethod: string;
    donationDate: string;
    notes: string;
    branchId: string;
  }>({
    memberId: "none",
    amount: "",
    donationType: "",
    paymentMethod: "",
    donationDate: new Date().toISOString().split("T")[0],
    notes: "",
    branchId: "none",
  });

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

  const createDonation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("donations").insert({
        member_id: data.memberId === "none" ? null : data.memberId,
        amount: parseFloat(data.amount),
        donation_type: data.donationType,
        payment_method: data.paymentMethod,
        donation_date: data.donationDate,
        notes: data.notes || null,
        branch_id: data.branchId === "none" ? null : data.branchId,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast({
        title: "Don enregistré",
        description: "Le reçu a été créé avec succès",
      });
      onOpenChange(false);
      setFormData({
        memberId: "none",
        amount: "",
        donationType: "",
        paymentMethod: "",
        donationDate: new Date().toISOString().split("T")[0],
        notes: "",
        branchId: "none",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Problème lors de l'enregistrement du don",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.donationType || !formData.paymentMethod) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }
    
    createDonation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enregistrer un Don</DialogTitle>
          <DialogDescription>
            Remplissez les informations sur la contribution
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberId">Membre (Optionnel)</Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) =>
                setFormData({ ...formData, memberId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Donateur anonyme</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montant (€)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationType">Type de Don *</Label>
            <Select
              value={formData.donationType || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, donationType: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tithe">Dîme</SelectItem>
                <SelectItem value="offering">Offrande</SelectItem>
                <SelectItem value="building">Bâtiment</SelectItem>
                <SelectItem value="mission">Mission</SelectItem>
                <SelectItem value="special">Spécial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Méthode de Paiement *</Label>
            <Select
              value={formData.paymentMethod || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir la méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="card">Carte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Branche (Optionnel)</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) =>
                setFormData({ ...formData, branchId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une branche" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune branche</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationDate">Date</Label>
            <Input
              id="donationDate"
              type="date"
              value={formData.donationDate}
              onChange={(e) =>
                setFormData({ ...formData, donationDate: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optionnel)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Notes additionnelles..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createDonation.isPending}>
              {createDonation.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
