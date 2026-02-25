import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";

interface Branch {
  id: string;
  name: string;
  description: string | null;
  leader_id: string | null;
  parent_branch_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: string;
}

interface BranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch;
  onSuccess: () => void;
}

export const BranchDialog = ({ open, onOpenChange, branch, onSuccess }: BranchDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader_id: "",
    parent_branch_id: "",
    address: "",
    phone: "",
    email: "",
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const { tenantId } = useCurrentTenant();

  const { data: members } = useQuery({
    queryKey: ["active-members"],
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
    queryKey: ["all-branches"],
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

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        description: branch.description || "",
        leader_id: branch.leader_id || "",
        parent_branch_id: branch.parent_branch_id || "",
        address: branch.address || "",
        phone: branch.phone || "",
        email: branch.email || "",
        status: branch.status,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        leader_id: "",
        parent_branch_id: "",
        address: "",
        phone: "",
        email: "",
        status: "active",
      });
    }
  }, [branch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        leader_id: formData.leader_id || null,
        parent_branch_id: formData.parent_branch_id || null,
        description: formData.description || null,
        address: formData.address || null,
        phone: formData.phone || null,
        email: formData.email || null,
        ...(branch ? {} : { tenant_id: tenantId }),
      };

      if (branch) {
        const { error } = await supabase
          .from("branches")
          .update(dataToSubmit)
          .eq("id", branch.id);

        if (error) throw error;
        toast.success("Branche modifiée avec succès");
      } else {
        const { error } = await supabase
          .from("branches")
          .insert([dataToSubmit]);

        if (error) throw error;
        toast.success("Branche créée avec succès");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error("Erreur lors de l'enregistrement de la branche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {branch ? "Modifier la branche" : "Nouvelle branche"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la branche *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leader">Responsable</Label>
              <Select
                value={formData.leader_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, leader_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Branche parente</Label>
              <Select
                value={formData.parent_branch_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, parent_branch_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une branche parente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune (Branche principale)</SelectItem>
                  {branches?.filter(b => b.id !== branch?.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : branch ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
