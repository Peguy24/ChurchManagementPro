

## Password Reset for Super Admin

**Current state:** The app has no forgot password or reset password functionality at all. Users who forget their password have no way to recover it.

**Plan:**

### 1. Add "Forgot Password" link to Auth page (`src/pages/Auth.tsx`)
- Add a "Mot de passe oublié ?" link below the login form password field
- Clicking it shows an inline form (or dialog) asking for email
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Shows success toast confirming the reset email was sent

### 2. Create Reset Password page (`src/pages/ResetPassword.tsx`)
- New page at `/reset-password` route
- Detects `type=recovery` in URL hash (set by the auth system's email link)
- Shows a form with "New password" and "Confirm password" fields
- Calls `supabase.auth.updateUser({ password })` to save
- On success, redirects to `/auth` with a success message

### 3. Register route in `src/App.tsx`
- Add `/reset-password` as a **public route** (no ProtectedRoute wrapper)

### 4. Add translations in `src/contexts/LanguageContext.tsx`
- Add French/English/Creole translations for forgot password and reset password labels

This works for all users (super admin, tenant admin, regular users) since it uses the standard auth password reset flow.

