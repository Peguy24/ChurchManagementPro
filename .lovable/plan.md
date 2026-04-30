# Goal

When a Super Admin deletes a church, the contact email must immediately become reusable to register a brand-new church — with no "email already registered" error — in both Test and Live environments.

# What's happening today

The trial registration form (`auto-provision-tenant`) blocks an email if **either**:
1. An auth user exists with that email, OR
2. A row in `tenants.contact_email` matches.

The `delete-tenant` function already:
- Deletes `tenants`, `tenant_subscriptions`, `tenant_requests` (by `created_tenant_id`), `admin_invitations`, `profiles`, `user_roles`, and the auth users tied to the tenant via `profiles.tenant_id`.

So in theory, deleting should free the email. The "email already registered" error in practice comes from a few real gaps:

1. **Test and Live are separate databases.** Deleting a church in Test does NOT delete it in Live (and vice-versa). After publishing, Live still has whatever rows existed there.
2. **Orphan `tenant_requests` rows** with `status='pending'` (or any other value) for the same email are NOT cleaned up — they only get deleted when their `created_tenant_id` matches. Old request rows survive but the email check above only looks at `tenants` and auth users, so this isn't the blocker — but they pollute the admin queue.
3. **Auth users not linked via `profiles.tenant_id`** (e.g., the admin signed up via the invitation link but their profile row never got `tenant_id` set, or they were a member of multiple churches) are left behind. The email check on line 65–67 then still finds them.
4. **`admin_invitations` rows** referencing the email may linger if cleanup partially failed.

# The plan

## 1. Harden `delete-tenant` to fully release every email

Update `supabase/functions/delete-tenant/index.ts`:

- Before deleting tables, collect **every email** associated with the tenant from these sources:
  - `tenants.contact_email`
  - `admin_invitations.email` for that tenant
  - `tenant_requests.contact_email` for that tenant (by `created_tenant_id`)
  - `profiles.id` → `auth.users.email` for every profile with `tenant_id = X`
  - `tenant_user_roles.user_id` → `auth.users.email` for that tenant
- Delete `tenant_requests` by `contact_email IN (collected_emails)` in addition to by `created_tenant_id`, so old pending/rejected rows are also cleared.
- For each collected email, look up the auth user by email (`listUsers` + filter, or paginate) and `auth.admin.deleteUser` if that user has no remaining `tenant_user_roles` or `platform_user_roles`. Skip super-admins.
- Delete any `admin_invitations` row matching the email globally.
- Keep the existing per-table cleanup loop.

This guarantees that after deletion no `tenants` row, no `auth.users` row, no `admin_invitations` row, and no leftover `tenant_requests` row holds the email.

## 2. Make the email-check in `auto-provision-tenant` smarter

Update `supabase/functions/auto-provision-tenant/index.ts`:

- Keep the duplicate-email checks but only block when the email is genuinely in use:
  - Block if `tenants.contact_email` exists.
  - Block if an auth user exists **AND** that user has at least one row in `tenant_user_roles` or `platform_user_roles` (i.e., is actively part of another church or is a platform admin).
  - If the auth user exists but is fully orphaned (no roles, no profile.tenant_id), delete it inline before proceeding so registration succeeds.
- Return clearer, localized error messages when truly blocked (the form already shows them).

## 3. Document the Test ⇄ Live separation in the UI

In the Super Admin "Tenant Management" delete confirmation, add a short note:

> "Deletion only affects the current environment (Test or Live). To free this email in the other environment, delete the church there as well."

Files: the existing delete confirmation dialog under `src/pages/TenantManagement.tsx` (or component used there).

## 4. Verification steps after deploy

1. In Test: register a church with `foo@bar.com` → delete it → re-register with `foo@bar.com` → should succeed.
2. Repeat in Live.
3. Register `foo@bar.com` for church A, then try to register church B with the same email → should still be blocked with the localized message.

# Files to change

- `supabase/functions/delete-tenant/index.ts` — exhaustive email release.
- `supabase/functions/auto-provision-tenant/index.ts` — orphan-aware duplicate check + auto-cleanup.
- `src/pages/TenantManagement.tsx` (or the dialog component it uses) — Test/Live note in delete confirmation, localized in EN/FR/HT.
- `src/contexts/LanguageContext.tsx` — three new translation keys for the note.

No DB migrations needed.
