

# Add input validation across all client forms

Currently the app has **no client-side input validation** beyond a few `type="email"` and `required` HTML attributes. Zod is already installed (`^3.25.76`) but never used in `src/`. This means users can submit empty names, oversized text, malformed emails, negative amounts, invalid phone numbers, etc. — and the only thing catching it is the database (which produces ugly error toasts) or, worse, nothing at all.

I'll introduce a centralized Zod-based validation layer and wire it into every form across the app, with friendly inline error messages.

## What I'll build

### 1. Shared validation library — `src/lib/validation.ts`

A single source of truth for reusable field schemas and form schemas:

- **Primitives**: `emailSchema`, `phoneSchema`, `nameSchema` (trim + 1–100 chars), `shortTextSchema` (≤255), `longTextSchema` (≤2000), `urlSchema`, `positiveAmountSchema`, `nonNegativeAmountSchema`, `dateSchema`, `passwordSchema` (≥8 chars, mix of letter+number).
- **Composite form schemas** for each dialog/page (member, donation, event, expense, branch, ministry, support ticket, church request, join church, invites, auth signup/login, custom fields, visitor, employee, etc.).
- A `validateForm(schema, data)` helper that returns `{ success, data, fieldErrors }` for easy mapping to UI state.

### 2. Reusable error display

A small `<FieldError>` component (reads from a `Record<string, string>` errors map) so every form renders inline errors consistently below inputs in `text-destructive` style.

### 3. Wire validation into every form

For each form below, I'll:
- Add an `errors` state of `Record<string, string>`.
- Call `validateForm(schema, formData)` at the top of `handleSubmit`; bail out + show toast + set errors if invalid.
- Clear a field's error on change.
- Render `<FieldError name="..." errors={errors} />` under each input.

**Forms to update (22 total):**

| Area | Files |
|---|---|
| Auth | `pages/Auth.tsx` (signup, login, forgot password), `pages/ResetPassword.tsx`, `components/LoginOtpVerification.tsx` |
| Members | `components/MemberDialog.tsx`, `components/JoinAsMemberDialog.tsx`, `pages/JoinChurch.tsx`, `components/MemberImportDialog.tsx` (per-row) |
| Finance | `components/DonationDialog.tsx`, `pages/Expenses.tsx`, `pages/Budgets.tsx`, `pages/Salaries.tsx` |
| Events & Attendance | `components/EventDialog.tsx`, `components/AttendanceDialog.tsx`, `pages/EventRegister.tsx` |
| Org | `components/BranchDialog.tsx`, `components/MinistryDialog.tsx`, `components/CustomFieldDialog.tsx` |
| Invites & Support | `components/AdminInviteDialog.tsx`, `components/SuperAdminInviteDialog.tsx`, `components/PlatformInviteDialog.tsx`, `components/SupportDialog.tsx`, `components/ChurchRequestForm.tsx` |
| Settings | `pages/ChurchSettings.tsx`, `pages/TenantBranding.tsx`, `pages/Visitors.tsx`, `pages/PlatformPayroll.tsx`, `pages/TenantManagement.tsx`, `pages/TenantUserManagement.tsx` |

### 4. Validation rules applied (examples)

- **Email**: trim, RFC-valid, ≤255 chars.
- **Names** (first/last/church/branch/ministry): trim, 1–100 chars, no leading/trailing whitespace.
- **Phone**: optional, 7–20 chars, digits + `+ - ( ) space`.
- **Amounts** (donations/expenses/salary): positive number, ≤9 999 999 999, max 2 decimals.
- **Dates**: valid ISO date; events can't be more than 100 years past/future.
- **Passwords** (signup/reset): ≥8 chars with at least one letter and one digit.
- **Long text** (notes/messages/descriptions): ≤2000 chars.
- **URLs** (logo/website): valid `http(s)://` URL, ≤500 chars.
- **OTP code**: exactly 6 digits.
- **Subject/title fields**: 1–200 chars.

### 5. What I will NOT touch

- Server-side RLS and edge-function zod schemas (already in place where it matters — `send-event-registration-email`, `send-bulk-announcement`, etc.).
- The Supabase generated files (`client.ts`, `types.ts`).
- Any business logic — only validation gating before the existing submit handlers run.

## Out of scope

- Replacing the entire form layer with `react-hook-form` (would be a much larger refactor). This plan keeps existing controlled-state forms and just layers validation on top.
- Translating new error messages — initial pass uses English defaults from the schema; a follow-up can move them through `useLanguage`.

## Files created / modified

- **Created**: `src/lib/validation.ts`, `src/components/FieldError.tsx`
- **Modified**: ~22 form files listed above

