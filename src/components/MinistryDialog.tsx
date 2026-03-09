import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { saveCustomFieldValues } from "@/lib/customFieldsUtils";

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
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const m = (key: string) => t(`ministries.${key}`);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    leader_id: "",
    branch_id: "",
    status: "active",
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-active", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .eq("tenant_id", tenantId)
        .order("first_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-active", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .eq("status", "active")
        .eq("tenant_id", tenantId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
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
      setFormData({ name: "", description: "", leader_id: "", branch_id: "", status: "active" });
    }
    setCustomFieldValues({});
  }, [ministry, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      toast.error(m("errorOccurred"));
      return;
    }
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
        await saveCustomFieldValues(ministry.id, customFieldValues, "ministry", tenantId);
        toast.success(m("editSuccess"));
      } else {
        const { data: inserted, error } = await supabase.from("ministries").insert([{
          name: formData.name,
          description: formData.description,
          leader_id: formData.leader_id || null,
          branch_id: formData.branch_id || null,
          status: formData.status,
          tenant_id: tenantId,
        }]).select("id").single();
        if (error) throw error;
        if (inserted) {
          await saveCustomFieldValues(inserted.id, customFieldValues, "ministry", tenantId);
        }
        toast.success(m("createSuccess"));
      }
      onSuccess();
      queryClient.invalidateQueries({ queryKey: ["ministries-active", tenantId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || m("errorOccurred"));
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
              {ministry ? m("editMinistry") : m("addNewMinistry")}
            </DialogTitle>
            <DialogDescription>
              {ministry ? m("dialogDescriptionEdit") : m("dialogDescriptionAdd")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{m("ministryNameLabel")} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{m("description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leader">{m("leader")}</Label>
              <Select
                value={formData.leader_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, leader_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={m("chooseLeader")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{m("none")}</SelectItem>
                  {members.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">{m("status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{m("active")}</SelectItem>
                  <SelectItem value="inactive">{m("inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branch">{m("branch")}</Label>
              <Select
                value={formData.branch_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, branch_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={m("chooseBranch")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{m("noBranch")}</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {m("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? m("loading") : ministry ? m("edit") : m("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
