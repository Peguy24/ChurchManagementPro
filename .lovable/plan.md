

## Current Situation

You've verified your domain in Resend -- that's the first critical step. Now, all 12 Edge Functions still use `onboarding@resend.dev` as the sender address. This is Resend's sandbox address, which can only send emails to your own Resend account email. To send to real church members, you need to update all functions to use your verified domain.

## What Needs to Be Done

### 1. Update all Edge Functions sender addresses
Replace `onboarding@resend.dev` with your verified domain (e.g., `noreply@yourdomain.com`) across these 12 functions:

| Function | Current `from` |
|---|---|
| `auto-provision-tenant` | `Church Manager Pro <onboarding@resend.dev>` |
| `send-admin-invite` | `Church Management <onboarding@resend.dev>` |
| `send-event-reminder` | `${tenant.name} <onboarding@resend.dev>` |
| `notify-admin-new-user` | `${churchName} <onboarding@resend.dev>` |
| `send-birthday-notification` | `${tenant.name} <onboarding@resend.dev>` |
| `send-superadmin-invite` | `Church Management <onboarding@resend.dev>` |
| `send-absence-alert` | `Église <onboarding@resend.dev>` |
| `send-welcome-email` | `Church Manager Pro <onboarding@resend.dev>` |
| `send-expense-notification` | `Gestion Église <onboarding@resend.dev>` |
| `send-user-invite` | `ChurchFlow <onboarding@resend.dev>` |
| `check-attendance-alerts` | `${tenant.name} <onboarding@resend.dev>` |
| `send-support-email` | `Church Manager Pro <onboarding@resend.dev>` |

### 2. Before I proceed, I need to know:
- **What is your verified domain?** (e.g., `churchmanagementpro.com`)
- **What sender name format do you prefer?** (e.g., `noreply@yourdomain.com`, `notifications@yourdomain.com`)

Once you provide the domain, I'll update all 12 Edge Functions in one pass.

