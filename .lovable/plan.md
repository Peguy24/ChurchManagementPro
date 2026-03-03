

## Plan: Event Registration System with QR Codes

### What we're building
Each event gets a unique public registration link and QR code. Anyone (no login needed) can scan/click the link to fill out a registration form. Admins see who registered for each event.

### Database changes

**New table: `event_registrations`**
- `id`, `event_id` (FK to events), `tenant_id`
- `first_name`, `last_name`, `email`, `phone`
- `status` (registered/checked_in/cancelled), `registered_at`
- RLS: public INSERT (anyone can register), tenant staff can SELECT/UPDATE/DELETE

### Files to create (3 new files)

1. **`src/pages/EventRegister.tsx`** -- Public registration form (similar to JoinChurch). Shows event name, date, location. Collects: first name, last name, email, phone. Success confirmation after submission.

2. **`src/pages/EventRegistrations.tsx`** -- Admin page to view/manage registrations for a specific event. Shows table of registrants with status badges. Export option.

3. **`src/components/EventQRCode.tsx`** -- Component that generates and displays a QR code + copyable link for a given event. Uses the existing `qrcode` library.

### Files to modify (3 files)

4. **`src/App.tsx`** -- Add routes:
   - `/event/:eventId/register` (public, no auth)
   - `/events/:eventId/registrations` (protected)

5. **`src/components/EventDialog.tsx`** -- Add a "Registration Link" section showing the QR code and shareable link when editing an existing event.

6. **`src/contexts/LanguageContext.tsx`** -- Add `eventRegistration` translation keys (FR/EN/HT) for form labels, success messages, admin labels.

### Technical details

- Registration URL format: `{origin}/event/{eventId}/register`
- QR code generated client-side using the existing `qrcode` npm package
- The public form fetches event + tenant info to display branding (logo, church name)
- No authentication required to register (like JoinChurch pattern)
- Admin view accessible from Events page via a "View Registrations" button per event

