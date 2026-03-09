

## Problem

The receipt download button in the Income (Donations) page does nothing — it only logs to console (`console.log("Generate receipt for:", donation)`). It needs to actually generate and download a PDF receipt for the individual donation.

## Plan

### 1. Create a donation receipt PDF generator (`src/lib/donationReceiptPDF.ts`)

Create a new file that generates a single-donation receipt PDF using jsPDF. It will include:
- Church header (name, address, phone, email)
- Receipt title ("Reçu de don" / "Donation Receipt" / "Resi don")
- Donor info (name, from the joined member data)
- Donation details: date, type, amount, payment method, description, reference number
- A certification line and signature placeholder
- Receipt number (using donation ID or reference_number)

Will follow the same styling patterns as `fiscalReceiptPDF.ts` and respect the ASCII-safe PDF constraint from project memory.

### 2. Update `src/pages/Donations.tsx`

- Import the new `generateDonationReceiptPDF` and `downloadDonationReceiptPDF` functions
- Replace the `console.log` on line 450 with an async handler that:
  1. Fetches the church settings (tenant settings) for church info
  2. Calls `generateDonationReceiptPDF` with the donation data
  3. Downloads the PDF

### 3. Add translations in `src/contexts/LanguageContext.tsx`

Add a `receipt` block with keys for:
- `receiptTitle`, `receiptNumber`, `donorInfo`, `donationDetails`, `certification`, `generatedBy`

All in FR, EN, and HT.

### Files to modify/create
- **Create**: `src/lib/donationReceiptPDF.ts`
- **Modify**: `src/pages/Donations.tsx` (replace console.log with actual receipt generation)
- **Modify**: `src/contexts/LanguageContext.tsx` (add receipt translations)

