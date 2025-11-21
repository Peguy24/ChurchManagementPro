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
  const [formData, setFormData] = useState({
    memberId: "",
    amount: "",
    donationType: "",
    paymentMethod: "",
    donationDate: new Date().toISOString().split("T")[0],
    notes: "",
    branchId: "",
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
        member_id: data.memberId || null,
        amount: parseFloat(data.amount),
        donation_type: data.donationType,
        payment_method: data.paymentMethod,
        donation_date: data.donationDate,
        notes: data.notes || null,
        branch_id: data.branchId || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donations"] });
      toast({
        title: "Don anrejistre",
        description: "Resi kreye ak siksè",
      });
      onOpenChange(false);
      setFormData({
        memberId: "",
        amount: "",
        donationType: "",
        paymentMethod: "",
        donationDate: new Date().toISOString().split("T")[0],
        notes: "",
        branchId: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Erè",
        description: "Pwoblèm pou anrejistre don an",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDonation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anrejistre yon Don</DialogTitle>
          <DialogDescription>
            Ranpli enfòmasyon sou kontribisyon an
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberId">Manm (Opsyonèl)</Label>
            <Select
              value={formData.memberId}
              onValueChange={(value) =>
                setFormData({ ...formData, memberId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chwazi yon manm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Donatè anonim</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Montan ($)</Label>
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
            <Label htmlFor="donationType">Tip Don</Label>
            <Select
              value={formData.donationType}
              onValueChange={(value) =>
                setFormData({ ...formData, donationType: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Chwazi tip" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tithe">Dim</SelectItem>
                <SelectItem value="offering">Ofrann</SelectItem>
                <SelectItem value="building">Batiman</SelectItem>
                <SelectItem value="mission">Misyon</SelectItem>
                <SelectItem value="special">Espesyal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Metòd Peman</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Chwazi metòd" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Lajan Kach</SelectItem>
                <SelectItem value="check">Chèk</SelectItem>
                <SelectItem value="transfer">Vire</SelectItem>
                <SelectItem value="mobile_money">Lajan Mobil</SelectItem>
                <SelectItem value="card">Kat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchId">Branch (Opsyonèl)</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) =>
                setFormData({ ...formData, branchId: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chwazi branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pa gen branch</SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationDate">Dat</Label>
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
            <Label htmlFor="notes">Nòt (Opsyonèl)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Nòt adisyonèl..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anile
            </Button>
            <Button type="submit" disabled={createDonation.isPending}>
              {createDonation.isPending ? "Anrejistre..." : "Anrejistre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
