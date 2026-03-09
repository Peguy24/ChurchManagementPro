
-- Drop the old unique constraint that doesn't account for tenants
ALTER TABLE public.custom_fields DROP CONSTRAINT custom_fields_entity_type_field_name_key;

-- Create a new unique constraint that includes tenant_id for proper multi-tenant isolation
ALTER TABLE public.custom_fields ADD CONSTRAINT custom_fields_tenant_entity_field_unique UNIQUE (tenant_id, entity_type, field_name);
