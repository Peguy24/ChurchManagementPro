

## Plan: Add "Join as Member" Button on Members Page

### What
Add a button on the Members page that opens the full member request form (same as `/join/:tenantId`) inside a dialog, so admins can submit a membership request for themselves or on behalf of someone without navigating to the public URL.

### Changes

**1. Create `src/components/JoinAsMemberDialog.tsx`**
- A dialog component that embeds the same multi-tab form from `JoinChurch.tsx` (personal info, address, spiritual life, family)
- Uses the current `tenantId` from `useCurrentTenant()`
- On submit, inserts into `member_requests` table (same logic as JoinChurch)
- Fully translated using `useLanguage()` and existing `joinForm.*` translation keys
- No language switcher needed since the admin dashboard already has one

**2. Update `src/pages/Members.tsx`**
- Add a "Join as Member" button (with `UserPlus` icon) in the button toolbar alongside Import/Export/Add
- Opens the new `JoinAsMemberDialog`
- Add translation keys: `members.joinAsMember`

**3. Add translations** in `LanguageContext.tsx`
- `members.joinAsMember`: "Join as Member" / "Rejoindre comme membre" / "Antre kòm manm"

### How the form works for admins
The dialog reuses the exact same form fields and tabs as the public join form — personal info, address, spiritual/church background, and family details. The admin fills it out completely, submits, and it appears in the Member Requests page for approval (another admin can approve it, or the same admin can self-approve from the requests page).

