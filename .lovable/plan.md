

## Problem

When an existing user (already registered for another church/tenant) receives an admin invitation for a **different** church, clicking "Create my admin account" fails because Supabase returns "User already registered." The current code shows "Account already exists, please log in" — but logging in does NOT automatically link the user to the new tenant or assign the admin role.

The core issue: the signup flow assumes every invited person is a brand new user. It needs to handle the case where the user already has a Supabase account from another tenant.

## Solution

Two changes are needed:

### 1. TenantAuth signup handler — handle existing users gracefully

When signup fails with "already registered" AND the user has a valid invitation:
- Instead of just showing an error, automatically attempt to **sign the user in** (prompt for password or redirect to login tab with a message).
- After successful login, proceed with the same tenant-linking logic (insert `tenant_user_roles`, update profile, mark invitation as used).

### 2. TenantAuth login handler — auto-link on login with invitation context

When a user **logs in** on a tenant auth page that has a valid invitation token or `invite_email` parameter:
- After successful login, check if the user already has a role for this tenant.
- If not, automatically insert the `tenant_user_roles` record with the appropriate role and approval status (same logic as signup).
- Mark the token invitation as used if applicable.

### Technical details

**File: `src/pages/TenantAuth.tsx`**

1. In `handleSignup` (around line 431-452): When error is "already registered" and `hasValidInvitation` is true:
   - Show a translated toast telling the user they already have an account and should log in to accept the invitation.
   - Auto-switch to the login tab and pre-fill the email.

2. In `handleLogin` (around line 329-362): After successful login:
   - Check if user already has a `tenant_user_roles` entry for this tenant.
   - If not, and there's a valid invitation context (token or invite_email param), insert the role and mark invitation as used.
   - Show appropriate success toast.

3. Add new translations for the "already have account, please log in" scenario in all 3 languages.

4. Add a state variable (e.g., `activeTab`) to programmatically switch between login/signup tabs.

