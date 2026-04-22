import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCurrentTenant } from "@/hooks/useCurrentTenant";
import { customFieldFullSchema, validateForm, firstErrorMessage } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: any;
  onSuccess: () => void;
}

export function CustomFieldDialog({ open, onOpenChange, field, onSuccess }: CustomFieldDialogProps) {
  const { t } = useLanguage();
  const { tenantId } = useCurrentTenant();
  const [formData, setFormData] = useState<{
    entity_type: "member" | "branch" | "ministry" | "event" | "donation";
    field_name: string;
    field_label: string;
    field_type: "text" | "textarea" | "number" | "date" | "select" | "checkbox";
    is_required: boolean;
    is_active: boolean;
    display_order: number;
    field_options: string[];
  }>({
    entity_type: "member",
    field_name: "",
    field_label: "",
    field_type: "text",
    is_required: false,
    is_active: true,
    display_order: 0,
    field_options: [],
  });
  const [loading, setLoading] = useState(false);
  const [newOption, setNewOption] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (field) {
      setFormData({
        entity_type: field.entity_type,
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        is_required: field.is_required,
        is_active: field.is_active,
        display_order: field.display_order,
        field_options: field.field_options?.options || [],
      });
    } else {
      setFormData({
        entity_type: "member",
        field_name: "",
        field_label: "",
        field_type: "text",
        is_required: false,
        is_active: true,
        display_order: 0,
        field_options: [],
      });
    }
  }, [field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedFieldName = formData.field_name.toLowerCase().replace(/\s+/g, "_");
    const validation = validateForm(customFieldFullSchema, {
      fieldLabel: formData.field_label,
      fieldName: normalizedFieldName,
      fieldType: formData.field_type,
      fieldOptions: formData.field_options,
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      toast.error(t(firstErrorMessage(validation.fieldErrors) || "errors.required"));
      return;
    }
    setErrors({});
    setLoading(true);

    const dataToSave = {
      entity_type: formData.entity_type,
      field_name: normalizedFieldName,
      field_label: formData.field_label,
      field_type: formData.field_type,
      is_required: formData.is_required,
      is_active: formData.is_active,
      display_order: formData.display_order,
      field_options:
        formData.field_type === "select"
          ? { options: formData.field_options }
          : null,
      ...(field ? {} : { tenant_id: tenantId }),
    };

    try {
      if (field) {
        const { error } = await supabase
          .from("custom_fields")
          .update(dataToSave)
          .eq("id", field.id);
        if (error) throw error;
        toast.success(t("customFields.editSuccess"));
      } else {
        const { error } = await supabase
          .from("custom_fields")
          .insert([dataToSave]);
        if (error) throw error;
        toast.success(t("customFields.createSuccess"));
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({
        ...formData,
        field_options: [...formData.field_options, newOption.trim()],
      });
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      field_options: formData.field_options.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {field ? t("customFields.dialogTitleEdit") : t("customFields.dialogTitleCreate")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("customFields.entityType")}</Label>
              <Select
                value={formData.entity_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, entity_type: value as typeof formData.entity_type })
                }
                disabled={!!field}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">{t("customFields.entityMember")}</SelectItem>
                  <SelectItem value="branch">{t("customFields.entityBranch")}</SelectItem>
                  <SelectItem value="ministry">{t("customFields.entityMinistry")}</SelectItem>
                  <SelectItem value="event">{t("customFields.entityEvent")}</SelectItem>
                  <SelectItem value="donation">{t("customFields.entityDonation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("customFields.fieldType")}</Label>
              <Select
                value={formData.field_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, field_type: value as typeof formData.field_type })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">{t("customFields.typeText")}</SelectItem>
                  <SelectItem value="textarea">{t("customFields.typeTextarea")}</SelectItem>
                  <SelectItem value="number">{t("customFields.typeNumber")}</SelectItem>
                  <SelectItem value="date">{t("customFields.typeDate")}</SelectItem>
                  <SelectItem value="select">{t("customFields.typeSelect")}</SelectItem>
                  <SelectItem value="checkbox">{t("customFields.typeCheckbox")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>{t("customFields.fieldNameInternal")}</Label>
            <Input
              value={formData.field_name}
              onChange={(e) => {
                setFormData({ ...formData, field_name: e.target.value });
                if (errors.fieldName) setErrors({ ...errors, fieldName: "" });
              }}
              placeholder={t("customFields.fieldNamePlaceholder")}
              required
              disabled={!!field}
            />
            <FieldError name="fieldName" errors={errors} />
          </div>

          <div>
            <Label>{t("customFields.fieldLabelDisplay")}</Label>
            <Input
              value={formData.field_label}
              onChange={(e) => {
                setFormData({ ...formData, field_label: e.target.value });
                if (errors.fieldLabel) setErrors({ ...errors, fieldLabel: "" });
              }}
              placeholder={t("customFields.fieldLabelPlaceholder")}
              required
            />
            <FieldError name="fieldLabel" errors={errors} />
          </div>

          {formData.field_type === "select" && (
            <div>
              <Label>{t("customFields.options")}</Label>
              <div className="space-y-2">
                {formData.field_options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={option} disabled />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder={t("customFields.newOption")}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                  />
                  <Button type="button" onClick={addOption} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("customFields.displayOrder")}</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("customFields.required")}</Label>
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("customFields.active")}</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("customFields.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {field ? t("customFields.edit") : t("customFields.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
