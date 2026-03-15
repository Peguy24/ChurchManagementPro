

# Plan: Require Login on Every Browser Session

## Problem
On shared computers (e.g., a church office PC), the persistent auth session means whoever opens the browser sees the last admin's dashboard without logging in. This is a security risk.

## Solution
End the authentication session when the browser is closed, so users must always log in fresh. This is achieved by:

1. **Detect new browser sessions** using `sessionStorage` (which is cleared when the browser closes, unlike `localStorage`).
2. **Force sign-out on app load** if the session marker is missing — meaning the browser was closed and reopened.
3. **Clear all caches** (role cache, tenant cache) on forced sign-out.

## Technical Changes

### 1. `src/hooks/useAuth.tsx`
- On mount, check for a `sessionStorage` marker (`app_session_active`).
- If the marker is **missing** but a Supabase session exists → call `supabase.auth.signOut()` and clear all cached data from `sessionStorage`.
- If the marker is present → proceed normally.
- After successful login, set the `app_session_active` marker in `sessionStorage`.

### 2. `src/hooks/useUserRole.tsx`
- When the forced sign-out clears `sessionStorage`, the cached role data (`user_role_cache`) is automatically gone, so no extra changes needed beyond what exists.

### 3. `src/hooks/useCurrentTenant.tsx`
- Same as above — the `tenant_cache` key in `sessionStorage` is already cleared when the browser closes.

### Key Behavior
- **Browser closed + reopened** → session marker gone → forced logout → login screen
- **Page refresh (same browser session)** → session marker still present → stays logged in
- **Tab closed but browser open** → `sessionStorage` persists per-tab origin, so opening a new tab will require login (safe default for shared computers)
- **Explicit logout** → already clears the session

This approach requires no UI changes — the login screen already exists. The only change is ensuring stale sessions from previous browser launches are invalidated on app startup.

