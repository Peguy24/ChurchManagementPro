import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface CustomFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: any;
  onSuccess: () => void;
}

export function CustomFieldDialog({
  open,
  onOpenChange,
  field,
  onSuccess,
}: CustomFieldDialogProps) {
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
    setLoading(true);

    const dataToSave = {
      entity_type: formData.entity_type,
      field_name: formData.field_name.toLowerCase().replace(/\s+/g, "_"),
      field_label: formData.field_label,
      field_type: formData.field_type,
      is_required: formData.is_required,
      is_active: formData.is_active,
      display_order: formData.display_order,
      field_options:
        formData.field_type === "select"
          ? { options: formData.field_options }
          : null,
    };

    try {
      if (field) {
        const { error } = await supabase
          .from("custom_fields")
          .update(dataToSave)
          .eq("id", field.id);

        if (error) throw error;
        toast.success("Chan modifye avèk siksè");
      } else {
        const { error } = await supabase
          .from("custom_fields")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Chan kreye avèk siksè");
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
            {field ? "Modifye Chan" : "Ajoute Nouvo Chan"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tip Antite</Label>
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
                  <SelectItem value="member">Manm</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                  <SelectItem value="ministry">Ministè</SelectItem>
                  <SelectItem value="event">Evènman</SelectItem>
                  <SelectItem value="donation">Don</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tip Chan</Label>
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
                  <SelectItem value="text">Tèks</SelectItem>
                  <SelectItem value="textarea">Tèks Long</SelectItem>
                  <SelectItem value="number">Nimewo</SelectItem>
                  <SelectItem value="date">Dat</SelectItem>
                  <SelectItem value="select">Lis Opsyon</SelectItem>
                  <SelectItem value="checkbox">Kaz Tcheke</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Non Chan (Entèn)</Label>
            <Input
              value={formData.field_name}
              onChange={(e) =>
                setFormData({ ...formData, field_name: e.target.value })
              }
              placeholder="ex: niveau_etude"
              required
              disabled={!!field}
            />
          </div>

          <div>
            <Label>Etikèt (Afichaj)</Label>
            <Input
              value={formData.field_label}
              onChange={(e) =>
                setFormData({ ...formData, field_label: e.target.value })
              }
              placeholder="ex: Nivo Etid"
              required
            />
          </div>

          {formData.field_type === "select" && (
            <div>
              <Label>Opsyon</Label>
              <div className="space-y-2">
                {formData.field_options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input value={option} disabled />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="Nouvo opsyon"
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
              <Label>Òd Afichaj</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Obligatwa</Label>
                <Switch
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Anile
            </Button>
            <Button type="submit" disabled={loading}>
              {field ? "Modifye" : "Kreye"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
