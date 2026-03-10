

## Fix: Remove "user" role from invite dropdown

**Problem**: The invite user dialog in `TenantUserManagement.tsx` shows "user" as a selectable role. The "user" role is a default pending role with no permissions — it should not be offered when inviting someone.

**Changes** (single file: `src/pages/TenantUserManagement.tsx`):

1. **Remove "user" from `ROLE_LABELS`** (line 63) — delete the `user: t('tenant.roleUser')` entry.

2. **Change default `inviteRole` state** from `'user'` to `'volunteer'` (lines 49 and 228) — so the dropdown defaults to the lowest valid role instead of an invalid one.

These are the only changes needed. The role dropdown iterates `Object.entries(ROLE_LABELS)` so removing the entry automatically removes it from the invite form. The `ROLE_LABELS` object is also used to display roles in the user list table, but "user" role users would appear as pending (unapproved) and won't show in the approved list, so removing the label there is safe.

