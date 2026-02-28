

## Plan: Generate a System Presentation PDF

Create a new page `/system-guide` accessible from the settings menu that generates a professional PDF document describing all system functionalities for church leadership.

### Implementation

**1. Create `src/lib/systemGuidePDF.ts`**
- Use `jspdf` (already installed) to generate a multi-page PDF
- Include sections covering all modules:
  - **Member Management**: Registration, profiles, custom fields, member cards with QR codes, photo management
  - **Attendance**: Manual & QR scan check-in, alerts for absent members, group comparison reports
  - **Financial Management**: Donations/tithes, expenses with approval workflow, budgets, bank accounts, cash registers, special funds, salary payments (synchronized with expenses & balances), bank reconciliation, audit trail
  - **Events & Ministries**: Event planning, ministry management, statistics
  - **Branches**: Multi-branch support
  - **Reports & Dashboards**: Financial dashboard, attendance reports, member reports, birthday reports, inventory reports, CSV/PDF exports
  - **Inventory**: Asset tracking, barcodes, maintenance, audit mode
  - **Communication**: Email templates, absence alerts, birthday notifications
  - **Smart Insights**: AI-powered analytics, engagement scores, churn risk predictions
  - **Settings**: Church info, currency selection, custom fields, user roles & permissions, white-label branding
  - **Subscription Plans**: Essential, Professional, Enterprise
  - **Security**: Role-based access (Admin, Pastor, Treasurer, Secretary, Volunteer)
- Professional formatting: cover page with logo placeholder, table of contents, section headers, icons described textually, color accents

**2. Create `src/pages/SystemGuide.tsx`**
- Simple page with a "Download PDF" button
- Preview of sections included
- Calls the PDF generation function

**3. Update `src/App.tsx`**
- Add route `/system-guide`

**4. Update `src/components/Layout.tsx`**
- Add link in Settings nav group

### Technical Details
- Uses `jspdf` already in dependencies
- PDF will be ~8-12 pages, bilingual support (uses current language from LanguageContext)
- No database changes needed

