

## Plan: Auto-Logout After 2 Minutes of Inactivity

### Overview
Create an inactivity tracker that monitors user interactions (mouse, keyboard, touch, scroll). After 2 minutes without activity, automatically sign the user out and redirect to the login page.

### Implementation

**New hook: `src/hooks/useInactivityLogout.tsx`**
- Track user activity events: `mousemove`, `keydown`, `click`, `scroll`, `touchstart`
- Reset a 2-minute timer on each event
- When the timer expires, call `supabase.auth.signOut()` and redirect to `/auth`
- Only activate when a user is authenticated
- Show a toast notification informing the user they were logged out due to inactivity

**Integration: `src/App.tsx`**
- Add an `InactivityGuard` wrapper component inside `BrowserRouter` that uses the hook
- It runs globally so inactivity is tracked across all pages

### Technical Details
- Uses `setTimeout` with 120,000ms (2 minutes)
- Event listeners are throttled to avoid performance issues (update last-activity timestamp at most every 1 second)
- Cleanup on unmount removes all listeners and timers
- Does not interfere with the existing `useAuth` hook or `ProtectedRoute`

