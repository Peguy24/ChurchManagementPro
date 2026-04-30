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
import { useLanguage } from "@/contexts/LanguageContext";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";
import { saveCustomFieldValues } from "@/lib/customFieldsUtils";
import { FieldError } from "@/components/FieldError";
import { validateForm, branchSchema, firstErrorMessage } from "@/lib/validation";

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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const { tenantId } = useCurrentTenant();
  const { t } = useLanguage();
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setCustomFieldValues({});
  }, [branch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm(branchSchema, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      description: formData.description,
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast.error(firstErrorMessage(validation.fieldErrors, t) || t("branches.saveError"));
      return;
    }
    setErrors({});
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
        await saveCustomFieldValues(branch.id, customFieldValues, "branch", tenantId);
        toast.success(t("branches.editSuccess"));
      } else {
        const { data: inserted, error } = await supabase
          .from("branches")
          .insert([dataToSubmit])
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) {
          await saveCustomFieldValues(inserted.id, customFieldValues, "branch", tenantId);
        }
        toast.success(t("branches.createSuccess"));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error(t("branches.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {branch ? t("branches.editBranch") : t("branches.newBranch")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("branches.branchName")} *</Label>
              <Input
                id="name"
                maxLength={100}
                value={formData.name}
                aria-invalid={!!errors.name}
                className={errors.name ? "border-destructive" : ""}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value.slice(0, 100) }); if (errors.name) setErrors((p) => ({ ...p, name: "" })); }}
              />
              <FieldError name="name" errors={errors} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t("branches.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("branches.active")}</SelectItem>
                  <SelectItem value="inactive">{t("branches.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("branches.description")}</Label>
            <Textarea
              id="description"
              maxLength={2000}
              value={formData.description}
              aria-invalid={!!errors.description}
              className={errors.description ? "border-destructive" : ""}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value.slice(0, 2000) }); if (errors.description) setErrors((p) => ({ ...p, description: "" })); }}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <FieldError name="description" errors={errors} />
              <span className="text-xs text-muted-foreground ml-auto">{formData.description.length}/2000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leader">{t("branches.responsible")}</Label>
              <Select
                value={formData.leader_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, leader_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("branches.selectResponsible")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("branches.none")}</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">{t("branches.parentBranch")}</Label>
              <Select
                value={formData.parent_branch_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, parent_branch_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("branches.selectParent")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("branches.noParent")}</SelectItem>
                  {branches?.filter(b => b.id !== branch?.id).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("branches.parentBranchHelp")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("branches.address")}</Label>
            <Input
              id="address"
              maxLength={255}
              value={formData.address}
              aria-invalid={!!errors.address}
              className={errors.address ? "border-destructive" : ""}
              onChange={(e) => { setFormData({ ...formData, address: e.target.value.slice(0, 255) }); if (errors.address) setErrors((p) => ({ ...p, address: "" })); }}
            />
            <FieldError name="address" errors={errors} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("branches.phone")}</Label>
              <Input
                id="phone"
                type="tel"
                maxLength={20}
                value={formData.phone}
                aria-invalid={!!errors.phone}
                className={errors.phone ? "border-destructive" : ""}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value.slice(0, 20) }); if (errors.phone) setErrors((p) => ({ ...p, phone: "" })); }}
              />
              <FieldError name="phone" errors={errors} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("branches.email")}</Label>
              <Input
                id="email"
                type="email"
                maxLength={255}
                value={formData.email}
                aria-invalid={!!errors.email}
                className={errors.email ? "border-destructive" : ""}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value.slice(0, 255) }); if (errors.email) setErrors((p) => ({ ...p, email: "" })); }}
              />
              <FieldError name="email" errors={errors} />
            </div>
          </div>


          {/* Custom Fields */}
          <CustomFieldsRenderer
            entityType="branch"
            entityId={branch?.id}
            values={customFieldValues}
            onChange={(fieldName, value) =>
              setCustomFieldValues((prev) => ({ ...prev, [fieldName]: value }))
            }
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("branches.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("branches.save") : branch ? t("branches.modify") : t("branches.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
