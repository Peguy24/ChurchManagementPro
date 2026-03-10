

## Problem Analysis

When a tenant admin sends a user invitation (via `send-user-invite` edge function), the invitation URL is `/t/{slug}/auth?invite_email=...&role=secretary`. When the invited person signs up, the code tries to:

1. Update `profiles.tenant_id` to the church's ID
2. Insert a `tenant_user_roles` record with `role=secretary, is_approved=false`

**However**, because email confirmation is enabled, the signup does NOT create an authenticated session. The `data.user` object is returned but `auth.uid()` is null for the Supabase client. This means:
- The **profile update fails silently** (RLS requires `auth.uid() = id`)
- The **tenant_user_roles insert fails silently** (RLS requires `user_id = auth.uid()`)

Result: The user ends up with `tenant_id = null` and no `tenant_user_roles` entry, so they appear in the Super Admin user management instead of the tenant's user management.

## Solution

Pass the `tenant_id`, `role`, and `is_approved` information in user metadata during signup. Then modify the `handle_new_user` database trigger (which runs as SECURITY DEFINER, bypassing RLS) to automatically create the `tenant_user_roles` record and set `profiles.tenant_id`.

### 1. Modify `handleSignup` in `src/pages/TenantAuth.tsx`
- Pass `tenant_id`, `tenant_role`, and `tenant_auto_approved` in the user metadata when calling `signUp`
- Remove the post-signup profile update and role insert code (it fails due to no session anyway)
- Keep the invitation token marking (move to edge function or handle on login)

### 2. Update `useAuth` hook to support extra metadata
- Allow `signUp` to accept additional metadata fields beyond first_name/last_name

### 3. Modify `handle_new_user` database trigger
- Check for `tenant_id` in `raw_user_meta_data`
- If present, set `profiles.tenant_id` during the initial profile insert
- If `tenant_role` is present, insert into `tenant_user_roles` with the correct role and approval status
- This runs as SECURITY DEFINER so it bypasses RLS

### 4. Handle invitation token marking on first login
- When user logs in after email verification, check if there's an unused `admin_invitations` token and mark it as used
- This is already partially handled in the login flow

### Technical Details

**Database migration** - Update `handle_new_user` function:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _tenant_role text;
  _tenant_auto_approved boolean;
BEGIN
  _tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  _tenant_role := NEW.raw_user_meta_data->>'tenant_role';
  _tenant_auto_approved := COALESCE((NEW.raw_user_meta_data->>'tenant_auto_approved')::boolean, false);

  INSERT INTO public.profiles (id, first_name, last_name, email, tenant_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.email,
    _tenant_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Auto-create tenant role if signup included tenant info
  IF _tenant_id IS NOT NULL AND _tenant_role IS NOT NULL THEN
    INSERT INTO public.tenant_user_roles (tenant_id, user_id, role, is_approved)
    VALUES (_tenant_id, NEW.id, _tenant_role::app_role, _tenant_auto_approved);
  END IF;
  
  RETURN NEW;
END;
$$;
```

**`src/hooks/useAuth.tsx`** - Add optional metadata parameter to `signUp`

**`src/pages/TenantAuth.tsx`** - Pass tenant info in signup metadata and remove the failing post-signup code:
```typescript
const { error, data } = await signUp(
  signupForm.email,
  signupForm.password,
  signupForm.firstName,
  signupForm.lastName,
  {
    tenant_id: tenant.id,
    tenant_role: roleToAssign,
    tenant_auto_approved: isAutoApproved,
    invite_token_id: isTokenInvite ? invitation?.id : undefined,
  }
);
```

Also mark the admin_invitation as used in the signup handler using a service-role edge function call, or handle it on first login.

