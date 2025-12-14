import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface MinistryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ministry?: any;
  onSuccess: () => void;
}

export default function MinistryDialog({
  open,
  onOpenChange,
  ministry,
  onSuccess,
}: MinistryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader_id: "",
    branch_id: "",
    status: "active",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-active"],
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

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active"],
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
    if (ministry) {
      setFormData({
        name: ministry.name || "",
        description: ministry.description || "",
        leader_id: ministry.leader_id || "",
        branch_id: ministry.branch_id || "",
        status: ministry.status || "active",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        leader_id: "",
        branch_id: "",
        status: "active",
      });
    }
  }, [ministry, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (ministry) {
        const { error } = await supabase
          .from("ministries")
          .update({
            name: formData.name,
            description: formData.description,
            leader_id: formData.leader_id || null,
            branch_id: formData.branch_id || null,
            status: formData.status,
          })
          .eq("id", ministry.id);

        if (error) throw error;
        toast.success("Ministère modifié avec succès");
      } else {
        const { error } = await supabase.from("ministries").insert([
          {
            name: formData.name,
            description: formData.description,
            leader_id: formData.leader_id || null,
            branch_id: formData.branch_id || null,
            status: formData.status,
          },
        ]);

        if (error) throw error;
        toast.success("Ministère créé avec succès");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Une erreur s'est produite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {ministry ? "Modifier le Ministère" : "Ajouter un Nouveau Ministère"}
            </DialogTitle>
            <DialogDescription>
              {ministry
                ? "Modifiez les informations du ministère"
                : "Remplissez les informations pour créer un nouveau ministère"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du Ministère *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leader">Responsable</Label>
              <Select
                value={formData.leader_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, leader_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch">Branche</Label>
              <Select
                value={formData.branch_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, branch_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une branche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {branches.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Chargement..." : ministry ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
