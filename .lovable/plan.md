## Goal

When a Super Admin **approves** a church's tax-exempt certificate, the system should automatically:
1. Mark the Stripe customer as `tax_exempt: 'exempt'` (already done today)
2. **NEW:** Look back at the church's recent paid invoices, find the tax amount charged, and refund only the tax portion to the original payment method
3. Email the church confirming the refund
4. Log the refund in our DB so we have an audit trail

No tax is refunded on rejection or revocation.

---

## User-facing behavior

**Church side:**
- Subscribes during pending review → pays plan + NJ tax (e.g. $29.99 + $1.99 = $31.98)
- A few days later, Super Admin approves their ST-5
- Church automatically receives:
  - $1.99 refund to their card (visible in their bank within 5-10 days)
  - Email: *"Your tax exemption was approved. We've refunded $1.99 in sales tax from your last invoice."*
- Future invoices = $0 tax

**Super Admin side:**
- On the Tax Exemptions Reviews page, after clicking **Approve**, sees a toast: *"Approved. Refunded $1.99 in tax to {Church Name}."*
- If no refundable invoice found: *"Approved. No tax to refund."*
- New "Refund History" column on the reviews table showing total tax refunded per church

---

## What gets refunded — rules

To stay safe and predictable:
- Only invoices **paid in the last 90 days** are eligible
- Only the **tax portion** is refunded, never the plan amount
- Only invoices where `tax > 0` and not already refunded
- Refund reason: `requested_by_customer`
- If the church has multiple recent paid invoices with tax, **all of them** within the 90-day window are refunded (covers the case where they paid 2-3 monthly invoices before approval)

---

## Technical changes

### 1. New DB table: `tax_exemption_refunds`
Tracks every automatic refund issued. Fields:
- `tenant_id`, `tax_exemption_id` (FK to `tenant_tax_exemptions`)
- `stripe_invoice_id`, `stripe_payment_intent_id`, `stripe_refund_id`
- `tax_amount_refunded` (numeric), `currency`
- `status` (`succeeded` | `failed` | `skipped`)
- `failure_reason` (nullable)
- `created_at`

RLS: Super Admins read all. Tenant admins read their own tenant's rows.

### 2. Modify `supabase/functions/update-tax-exempt-status/index.ts`
After updating Stripe customer to `tax_exempt: 'exempt'` on **approve**:
1. Fetch the customer's invoices via `stripe.invoices.list({ customer, limit: 20, status: 'paid' })`
2. Filter invoices where:
   - `created` within last 90 days
   - `tax > 0`
   - `payment_intent` exists
   - No existing row in `tax_exemption_refunds` for this `stripe_invoice_id`
3. For each matching invoice → `stripe.refunds.create({ payment_intent, amount: invoice.tax, reason: 'requested_by_customer', metadata: { type: 'tax_exemption', tenant_id, invoice_id } })`
4. Insert a row in `tax_exemption_refunds` (success or failure)
5. Sum total refunded → return `{ success: true, status, refund_total, refund_count }` to caller

Errors per invoice are caught individually so one bad invoice doesn't abort the rest.

### 3. New edge function: `send-tax-refund-email`
Called by `update-tax-exempt-status` after refunds are created. Sends a trilingual (EN/FR/HT) Resend email to the church's contact email with:
- Refund amount + currency
- Last 4 of card
- Stripe refund ID(s) for their records
- "Future invoices will have no sales tax"

Uses existing Resend setup (`noreply@churchmanagementpro.com`).

### 4. Frontend updates
- `src/pages/TaxExemptionReviews.tsx`:
  - Toast on approve shows refund total returned by edge function
  - New "Refunds" column showing total tax refunded for each tenant (queried from `tax_exemption_refunds`)
  - New expandable detail panel listing each individual refund (date, invoice, amount, Stripe refund ID)
- `src/components/TaxExemptionSection.tsx` (church-side):
  - When status = `approved`, show a small "Refunds Issued" section listing any auto-refunds (tenant-readable rows from new table)

### 5. i18n keys (EN/FR/HT)
Neutral DB-style keys, e.g.:
- `tax.exemption.approved_with_refund` → "Approved. Refunded {amount} in tax."
- `tax.exemption.approved_no_refund` → "Approved. No tax to refund."
- `tax.refund.email_subject` → "Your tax exemption was approved — refund issued"
- `tax.refund.history_title` → "Refunds Issued"

---

## Files touched

- New migration: `tax_exemption_refunds` table + RLS policies
- `supabase/functions/update-tax-exempt-status/index.ts` (refund logic)
- `supabase/functions/send-tax-refund-email/index.ts` (new)
- `src/pages/TaxExemptionReviews.tsx` (refunds column + toast)
- `src/components/TaxExemptionSection.tsx` (refund history for church)
- `src/contexts/LanguageContext.tsx` (3 languages × ~6 keys)

---

## Out of scope (kept simple on purpose)

- No retroactive refunds beyond 90 days (older invoices are filed/remitted to NJ already)
- No partial-month proration adjustments
- If a refund fails (e.g. payment method removed), it's logged as `failed` and surfaced on the review page so you can manually handle it
- Rejection / revocation of an exemption does **not** issue any refund or back-charge

