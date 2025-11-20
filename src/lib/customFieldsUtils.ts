import { supabase } from "@/integrations/supabase/client";

export interface CustomFieldValue {
  custom_field_id: string;
  entity_id: string;
  field_value: string;
}

/**
 * Saves custom field values for an entity
 * @param entityId - The ID of the entity (member, branch, ministry, etc.)
 * @param customFieldValues - Object mapping field names to their values
 * @param entityType - Type of entity (member, branch, ministry, event, donation)
 */
export async function saveCustomFieldValues(
  entityId: string,
  customFieldValues: Record<string, string>,
  entityType: "member" | "branch" | "ministry" | "event" | "donation"
) {
  // Get field definitions for this entity type
  const { data: fields, error: fieldsError } = await supabase
    .from("custom_fields")
    .select("id, field_name")
    .eq("entity_type", entityType)
    .eq("is_active", true);

  if (fieldsError) throw fieldsError;
  if (!fields || fields.length === 0) return;

  // Build the values to save
  const valuesToSave: CustomFieldValue[] = [];

  for (const field of fields) {
    const value = customFieldValues[field.field_name];
    if (value !== undefined && value !== "") {
      valuesToSave.push({
        custom_field_id: field.id,
        entity_id: entityId,
        field_value: value,
      });
    }
  }

  if (valuesToSave.length === 0) return;

  // Delete existing values for this entity
  const { error: deleteError } = await supabase
    .from("custom_field_values")
    .delete()
    .eq("entity_id", entityId);

  if (deleteError) throw deleteError;

  // Insert new values
  const { error: insertError } = await supabase
    .from("custom_field_values")
    .insert(valuesToSave);

  if (insertError) throw insertError;
}

/**
 * Gets custom field values for an entity
 * @param entityId - The ID of the entity
 * @returns Object mapping field names to their values
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
