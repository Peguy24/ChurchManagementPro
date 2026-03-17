

## Plan: Populate Default Legal Documents Content

### What

Update the 3 existing `legal_documents` rows (currently placeholder text) with comprehensive, real legal content in all 3 languages (FR, EN, HT) tailored to the Church Management Pro platform.

### Content Summary

**Terms of Use** — Covers: account creation, acceptable use, church data ownership, platform responsibilities, user obligations, intellectual property, termination, limitation of liability, governing law.

**Privacy Policy** — Covers: data collected (church members, attendance, donations), how data is used, data storage & security, third-party services (Stripe for payments), data retention, user rights (access, correction, deletion), cookies, contact information.

**Payment Terms** — Covers: subscription plans (Free, Essential $49, Professional $99, Premium $199, Enterprise $499), free trial (14 days), billing cycles (monthly/yearly), auto-renewal, cancellation & refund policy, failed payments, price changes, Stripe as payment processor.

### Implementation

**Single migration file** that runs `UPDATE` statements on the 3 existing rows in `legal_documents`, replacing placeholder text with full legal content. Each document ~1500-2500 words per language. Version bumped to 2.

### Files

| File | Action |
|------|--------|
| `supabase/migrations/..._seed_legal_content.sql` | Create — UPDATE 3 rows with real content |

No UI changes needed — the Super Admin can view and edit the content from the existing `/super-admin/legal` page.

