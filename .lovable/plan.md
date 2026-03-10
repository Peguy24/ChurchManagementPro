

## Plan: Custom Roles System for Tenant Admins

### Overview
Allow tenant admins to create custom roles with specific permissions, and assign those custom roles to users. Currently, roles are limited to a fixed Postgres enum (`admin`, `pastor`, `treasurer`, `secretary`, `volunteer`, `user`). This feature adds a flexible layer on top of that.

### Database Changes

**New table: `tenant_custom_roles`**
- `id` (uuid, PK)
- `tenant_id` (uuid, FK to tenants)
- `name` (text) — e.g. "Responsable Jeunesse", "Diacre"
- `description` (text, nullable)
- `created_at`, `updated_at`
- Unique constraint on (tenant_id, name)

**New table: `tenant_custom_role_permissions`**
- `id` (uuid, PK)
- `custom_role_id` (uuid, FK to tenant_custom_roles, cascade delete)
- `permission_group` (text) — same values as RouteGroup (dashboard, members, finances, etc.)
- Unique constraint on (custom_role_id, permission_group)

**Alter `tenant_user_roles`**
- Add `custom_role_id` (uuid, nullable, FK to tenant_custom_roles)
- When `custom_role_id` is set, permissions come from the custom role instead of the enum `role` column
- The enum `role` would default to `volunteer` as a base for custom roles (to satisfy the NOT NULL enum constraint)

RLS policies: tenant-scoped access for both new tables, admin-only write access.

### Frontend Changes

1. **New component: `TenantCustomRolesManager.tsx`**
   - UI to create, edit, and delete custom roles
   - For each custom role: name input, description, and a permission checkbox grid (same as existing TenantRolePermissionsManager)
   - Delete confirmation with warning if users are assigned to that role

2. **Update `TenantRolePermissionsManager.tsx`**
   - Add a section or tab showing custom roles alongside the built-in roles
   - Custom roles appear as additional columns in the permissions grid

3. **Update `TenantUserManagement.tsx`**
   - Role selection dropdown includes both built-in roles and custom roles
   - When assigning a custom role, set `custom_role_id` on the user record
   - Display custom role names in user list

4. **Update `useUserRole.tsx`**
   - When fetching tenant role, also check if user has a `custom_role_id`
   - If custom role exists, fetch permissions from `tenant_custom_role_permissions` instead of `role_permissions`
   - Feed those permissions into the existing permission system

5. **Update `Layout.tsx` / navigation**
   - No structural changes needed — the existing permission-checking functions already work with permission maps; we just need to supply the correct one for custom roles

6. **Update invite flow**
   - `send-user-invite` edge function: accept custom role ID as an alternative to the enum role

### Technical Details

```text
┌──────────────────────┐       ┌──────────────────────────────┐
│ tenant_custom_roles  │──────▶│ tenant_custom_role_permissions│
│  id, tenant_id, name │  1:N  │  custom_role_id, perm_group  │
└──────────────────────┘       └──────────────────────────────┘
         │
         │ (optional FK)
         ▼
┌──────────────────────────┐
│   tenant_user_roles      │
│  role (enum), custom_role_id (nullable) │
└──────────────────────────┘
```

- When `custom_role_id` is NULL → use standard enum `role` + `role_permissions` table
- When `custom_role_id` is set → use `tenant_custom_role_permissions` for that custom role
- The `role` enum column stays as `volunteer` (or similar) for custom-role users to satisfy DB constraints

### Scope
- 2 new database tables + 1 column addition
- 1 new component (custom roles manager)
- Updates to 4-5 existing files
- Edge function update for invites

