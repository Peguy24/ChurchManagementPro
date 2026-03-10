

## Three Issues to Fix

### 1. After signup, show "Check your email" message
Currently after a successful signup, the code calls `navigate('/')` which redirects away. Since email confirmation is enabled (default in Supabase), the user needs to verify their email first. The signup handler should instead show a clear message telling the user to check their email inbox for a verification link, in the appropriate language (EN/FR/HT).

**Changes in `src/pages/TenantAuth.tsx`:**
- After successful signup (lines 585-597), instead of `navigate('/')`, display a confirmation screen/toast telling the user to verify their email
- Add new translation keys: `checkEmailTitle`, `checkEmailDesc` in all 3 languages
- Add a state variable (e.g. `showEmailConfirmation`) to render a confirmation card instead of the form

### 2. Fix PendingApproval page — add full translations (EN/FR/HT)
Currently all text is hardcoded in French.

**Changes in `src/pages/PendingApproval.tsx`:**
- Add local translations map (EN/FR/HT) for all strings: title, description, instructions, button label, "logged in as"
- Use `useLanguage()` (already imported) to select the right language

### 3. User Management — pending users section not visible
The code in `TenantUserManagement.tsx` already has approve/reject functionality (lines 115-165) and renders a pending users card (lines 375-432). The issue is likely that the `user_email` field shows `user-XXXXXXXX` instead of the real email, making it hard to identify users. Also, the pending section only shows when `pendingUsers.length > 0` — need to verify users are actually being inserted with `is_approved: false`.

**Changes in `src/pages/TenantUserManagement.tsx`:**
- Fetch user emails from `auth.users` via a security-definer function or by storing email in `tenant_user_roles` or profiles
- Currently email shows as `user-${role.user_id.slice(0, 8)}` (line 98) — need to fetch actual email from profiles or add it during role insertion
- The approve/reject buttons already exist and work. The real fix is ensuring users can be identified (show real name/email)

**Additional fix:** Store the user's email in `profiles` table during signup so it can be queried. Or add an `email` column to `tenant_user_roles`.

### Technical Plan

1. **`src/pages/TenantAuth.tsx`**: 
   - Add `showEmailConfirmation` state
   - Add translations: `checkEmailTitle` ("Check your email" / "Vérifiez votre email" / "Tcheke imèl ou"), `checkEmailDesc` with instructions
   - After successful non-auto-approved signup, set `showEmailConfirmation = true` instead of navigating
   - Render a confirmation card with email icon and message when `showEmailConfirmation` is true

2. **`src/pages/PendingApproval.tsx`**:
   - Add local translation map for EN/FR/HT covering: title, subtitle, description, contact admin message, "logged in as", logout button
   - Replace all hardcoded French strings with translated versions

3. **`src/pages/TenantUserManagement.tsx`**:
   - Fix email display: fetch email from `auth.users` table via the profiles table (store email in profiles during signup)
   - Or simpler: add email storage during signup in TenantAuth

4. **`src/pages/TenantAuth.tsx` (signup handler)**: Store email in profiles table during signup: `update profiles set email = signupForm.email where id = data.user.id`

5. **Database migration**: Add `email` column to `profiles` table if not already present, and update `TenantUserManagement` to display it.

