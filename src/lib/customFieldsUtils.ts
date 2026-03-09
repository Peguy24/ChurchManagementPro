import { supabase } from "@/integrations/supabase/client";

export interface CustomFieldValue {
  custom_field_id: string;
  entity_id: string;
  field_value: string;
  tenant_id?: string;
}

/**
 * Saves custom field values for an entity
 */
export async function saveCustomFieldValues(
  entityId: string,
  customFieldValues: Record<string, string>,
  entityType: "member" | "branch" | "ministry" | "event" | "donation",
  tenantId?: string
) {
  let query = supabase
    .from("custom_fields")
    .select("id, field_name")
    .eq("entity_type", entityType)
    .eq("is_active", true);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: fields, error: fieldsError } = await query;

  if (fieldsError) throw fieldsError;
  if (!fields || fields.length === 0) return;

  const valuesToSave: CustomFieldValue[] = [];

  for (const field of fields) {
    const value = customFieldValues[field.field_name];
    if (value !== undefined && value !== "") {
      valuesToSave.push({
        custom_field_id: field.id,
        entity_id: entityId,
        field_value: value,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
    }
  }

  if (valuesToSave.length === 0) return;

  const { error: deleteError } = await supabase
    .from("custom_field_values")
    .delete()
    .eq("entity_id", entityId);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase
    .from("custom_field_values")
    .insert(valuesToSave);

  if (insertError) throw insertError;
}

/**
 * Gets custom field values for an entity
 */
export async function getCustomFieldValues(
  entityId: string
): Promise<Record<string, string>> {
  const { data: values, error } = await supabase
    .from("custom_field_values")
    .select(
      `
      field_value,
      custom_field:custom_fields(field_name)
    `
    )
    .eq("entity_id", entityId);

  if (error) throw error;

  const result: Record<string, string> = {};
  
  if (values) {
    for (const item of values) {
      if (item.custom_field && 'field_name' in item.custom_field) {
        result[item.custom_field.field_name] = item.field_value;
      }
    }
  }

  return result;
}
