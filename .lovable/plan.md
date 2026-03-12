

## Investigation Results

**helptechaiti@gmail.com** status:
- User exists (id: `c0f85aab-...`), email confirmed, profile linked to tenant `b921daeb-...` (Eglise Test)
- User metadata correctly contains `tenant_role: pastor`, `tenant_auto_approved: false`
- Signup verification email was sent and delivered successfully (status: `sent`)
- **ROOT CAUSE**: The `tenant_user_roles` row is **MISSING** - the `handle_new_user` trigger should have created it but didn't (likely a transient error during signup). Without this row, the user doesn't appear in the tenant admin's pending approvals list.

## Plan

### 1. Fix the immediate data issue
Insert the missing `tenant_user_roles` entry for helptechaiti@gmail.com as **pastor** with `is_approved = false` using a data insert tool.

### 2. Make the `handle_new_user` trigger robust
Add exception handling around the `tenant_user_roles` INSERT in the trigger so that if it fails, it logs the error but doesn't prevent user creation. Use `BEGIN...EXCEPTION WHEN OTHERS` block.

### 3. Add frontend fallback in TenantAuth login flow
When an existing user logs in on `/t/:slug/auth` with invitation context (`invite_email` or `invite` token), and no `tenant_user_roles` entry exists for them, automatically create the missing entry. This covers cases where the trigger failed.

### 4. Add frontend fallback in TenantAuth signup confirmation flow  
After the user confirms their email and returns to the app, check if their `tenant_user_roles` entry exists. If not, create it based on the URL parameters (role, tenant).

### Technical Details

**Trigger change** (migration):
```sql
-- In handle_new_user, wrap tenant_user_roles INSERT:
BEGIN
  INSERT INTO public.tenant_user_roles (tenant_id, user_id, role, is_approved)
  VALUES (_tenant_id, NEW.id, _tenant_role::app_role, _tenant_auto_approved);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to insert tenant_user_roles for user %: %', NEW.id, SQLERRM;
END;
```

**TenantAuth.tsx changes**:
- In `handleLogin` (after successful login with invitation context): if no existing `tenant_user_roles` row, insert one
- In `checkUserTenantAccess`: also check and create missing role if URL has invitation params

**Files to modify**:
- `src/pages/TenantAuth.tsx` - add fallback role creation on login
- Database migration - harden `handle_new_user` trigger
- Data fix - insert missing row for helptechaiti@gmail.com

