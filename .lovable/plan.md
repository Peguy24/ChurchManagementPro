# Plan: Stripe Tax with Church Tax-Exempt Workflow

Goal: collect NJ (and other states') sales tax automatically at checkout via Stripe Tax, and skip tax for churches whose tax-exempt certificate has been approved by a Super Admin.

## 1. Database — `tenant_tax_exemptions` table

New table to track each tenant's exemption status:
- `tenant_id` (unique)
- `status`: `none` | `pending` | `approved` | `rejected`
- `certificate_url` (file in storage)
- `state` (e.g., "NJ")
- `ein_number`
- `submitted_at`, `reviewed_at`, `reviewed_by`, `rejection_reason`
- `expires_at` (certificates often need yearly renewal)

RLS:
- Tenant admins: can view/insert/update their own tenant's row
- Super Admins: can view/update all rows

Storage bucket `tax-exemption-certificates` (private), with policies allowing tenant admins to upload to their `{tenant_id}/...` folder, and Super Admins to read all.

## 2. Tenant UI — Settings → Tax Exemption

New section in Church Settings:
- Upload certificate (PDF/image)
- State + EIN fields
- Status badge: None / Pending review / Approved / Rejected (with reason)
- Re-submit button after rejection or expiry

Trilingual (EN/FR/HT) using neutral DB keys per project memory.

## 3. Super Admin UI — Tax Exemption Reviews

New page `/superadmin/tax-exemptions`:
- List of pending requests (church name, state, submitted date)
- Preview certificate inline
- Approve / Reject (with reason) buttons
- On approval → edge function sets the Stripe customer's `tax_exempt: 'exempt'`
- On rejection or revocation → sets back to `'none'`

## 4. Edge function — `update-tax-exempt-status`

Triggered by Super Admin approve/reject:
- Updates DB row
- Looks up Stripe customer by tenant's email
- Calls `stripe.customers.update(id, { tax_exempt: 'exempt' | 'none' })`
- Sends notification email to tenant admin (approved / rejected)

## 5. Modify `create-checkout` edge function

- Add `automatic_tax: { enabled: true }` to checkout session params
- Add `customer_update: { address: 'auto', name: 'auto' }` (required by Stripe Tax)
- If creating a new customer, no change needed — Stripe Tax reads the customer's `tax_exempt` field automatically. Approved exempt customers are billed $0 tax; others get NJ sales tax (or their state's rate) added at checkout.

## 6. Stripe Tax setup (manual, one-time)

User action required in Stripe Dashboard:
- Enable **Stripe Tax** (Settings → Tax)
- Add **NJ as origin address** (their LLC address)
- Register tax IDs as nexus is reached (start with NJ)
- Set product tax codes on the 6 subscription prices (likely `txcd_10103001` — SaaS, or `txcd_10103000` for digital services). I'll add a script to apply codes via API once they confirm.

I'll provide step-by-step instructions in chat after implementation.

## Technical notes

- `automatic_tax` requires the customer to have a billable address. Stripe Checkout collects this automatically when enabled.
- NJ taxes SaaS at 6.625% — Stripe Tax handles the calculation.
- Exemption flag on a Stripe customer applies to all future invoices, including subscription renewals — no need to re-flag each time.
- Certificate files stored privately; only Super Admins and the owning tenant can access them.

## Files touched

- `supabase/migrations/...` — new table, RLS, storage bucket
- `supabase/functions/create-checkout/index.ts` — enable automatic_tax
- `supabase/functions/update-tax-exempt-status/index.ts` — new
- `src/pages/ChurchSettings.tsx` — add Tax Exemption section
- `src/pages/superadmin/TaxExemptionReviews.tsx` — new page
- `src/App.tsx` — route for new page
- `src/contexts/LanguageContext.tsx` — EN/FR/HT keys
- Sidebar/nav for Super Admin entry
