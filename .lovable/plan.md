

## Current State

The member request form at `/join/:tenantId` is already **publicly accessible** — there are no authentication restrictions. Any tenant admin or super admin can navigate to this URL and fill it out. The RLS INSERT policy on `member_requests` allows anyone (authenticated or not) to insert rows as long as `tenant_id`, `first_name`, `last_name` are provided and `status = 'pending'`.

The MemberRequests page already shows the join URL and a QR code that admins can share or use themselves.

## So What's the Issue?

There is **no issue to fix**. The architecture already supports this:

1. **Tenant admin wants to become a member of their own church** — They visit `/join/{their-tenant-id}`, fill the form, and their request appears in the Member Requests page for approval by another admin.

2. **Super admin wants to become a member of any church** — They visit `/join/{any-tenant-id}` and submit the form. The church's admin reviews and approves it.

3. **The form works for both anonymous and authenticated users** — The insert policy has no `auth.uid()` check.

## No Code Changes Needed

The current system correctly handles this use case. If you'd like, I can add a convenience button inside the admin dashboard (e.g., on the Members page) that says "Join as Member" and opens the join form for the current tenant — but functionally, everything already works as you described.

Would you like me to add that convenience button, or is there a specific problem you're encountering when trying to submit the form as an admin?

