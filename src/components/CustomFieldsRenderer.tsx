import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomFieldsRendererProps {
  entityType: "member" | "branch" | "ministry" | "event" | "donation";
  entityId?: string;
  values: Record<string, string>;
  onChange: (fieldName: string, value: string) => void;
}

export function CustomFieldsRenderer({
  entityType,
  entityId,
  values,
  onChange,
}: CustomFieldsRendererProps) {
  const { data: fields } = useQuery({
    queryKey: ["custom-fields", entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .eq("entity_type", entityType)
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      return data;
    },
  });

  const { data: existingValues } = useQuery({
    queryKey: ["custom-field-values", entityId],
    queryFn: async () => {
      if (!entityId) return [];

      const { data, error } = await supabase
        .from("custom_field_values")
        .select("custom_field_id, field_value")
        .eq("entity_id", entityId);

      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  useEffect(() => {
    if (existingValues && fields) {
      existingValues.forEach((val) => {
        const field = fields.find((f) => f.id === val.custom_field_id);
        if (field && !values[field.field_name]) {
          onChange(field.field_name, val.field_value);
        }
      });
    }
  }, [existingValues, fields]);

  if (!fields || fields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-semibold">Chan Pèsonalize</h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.id}>
            <Label>
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </Label>

            {field.field_type === "text" && (
              <Input
                value={values[field.field_name] || ""}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
              />
            )}

            {field.field_type === "textarea" && (
              <Textarea
                value={values[field.field_name] || ""}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
              />
            )}

            {field.field_type === "number" && (
              <Input
                type="number"
                value={values[field.field_name] || ""}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
              />
            )}

            {field.field_type === "date" && (
              <Input
                type="date"
                value={values[field.field_name] || ""}
                onChange={(e) => onChange(field.field_name, e.target.value)}
                required={field.is_required}
              />
            )}

            {field.field_type === "select" && (
              <Select
                value={values[field.field_name] || ""}
                onValueChange={(value) => onChange(field.field_name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chwazi..." />
                </SelectTrigger>
                <SelectContent>
                  {(field.field_options as any)?.options?.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {field.field_type === "checkbox" && (
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  checked={values[field.field_name] === "true"}
                  onCheckedChange={(checked) =>
                    onChange(field.field_name, checked ? "true" : "false")
                  }
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
