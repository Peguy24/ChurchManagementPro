## Goal
Rebuild `Church_Manager_Pro_Pastor_Pitch.pptx` so it uses:
1. The **real Church Manager Pro logo** (`/public/images/church-management-pro-logo.png`) — not any tenant logo.
2. **Real in-app screenshots** of the tenant dashboard (not just the public marketing page).

## Approach

### Step 1 — Capture real dashboard screenshots
Drive the browser through the **published** site (`https://cogmpw-sys.lovable.app`) where you're already logged in, and screenshot these screens at 1536×864:

1. `/dashboard` — main overview with stats cards
2. `/members` — member list with filters
3. `/attendance` — attendance tracking with punctuality (Early / On Time / Late)
4. `/donations` — donations / contributions
5. `/finances` (or `/recettes` + `/expenses`) — internal income & expenses
6. `/events` — event list
7. `/settings/branches` — multi-church / branch structure
8. `/super-admin` — platform overview (if you want me to include it; tells the "we operate this seriously" story)

If any route doesn't match, I'll observe the sidebar and adapt.

If the browser session doesn't carry your login (likely — browser tool uses a separate session), I'll pause and ask you to either:
- Paste the email/password so I can log in once, OR
- Upload the screenshots yourself.

### Step 2 — Rebuild the PPTX
Regenerate `Church_Manager_Pro_Pastor_Pitch_v2.pptx` with the same 15-slide structure (Navy `#1E2761` / Gold `#D4AF37` / Cream palette, Georgia + Calibri), but:
- **Title slide & every footer**: embed `church-management-pro-logo.png` (top-left, ~0.6" tall).
- **Replace public-page screenshots** with the real dashboard captures, mapped to the relevant slides:
  - Slide 4 (Member Management) → `/members` screenshot
  - Slide 5 (Attendance) → `/attendance` screenshot
  - Slide 6 (Financial Transparency) → `/finances` or `/donations`
  - Slide 7 (Multi-Branch) → `/settings/branches`
  - Slide 8 (Events) → `/events`
  - Slide 11 (Dashboard at a Glance) → `/dashboard`
- Keep all text/structure from the previous version.

### Step 3 — QA
- Convert PPTX → PDF → JPEG per slide.
- Visually inspect each slide for: logo present & not stretched, screenshots not cut off, text legible over images, no overlaps.
- Fix and re-render until clean.
- Save to `/mnt/documents/Church_Manager_Pro_Pastor_Pitch_v2.pptx`.

## Technical details
- Logo source: `public/images/church-management-pro-logo.png` (embed as base64).
- Screenshot capture: `browser--navigate_to_sandbox` + `browser--screenshot`, save PNGs to `/tmp/`.
- Generation: Node + `pptxgenjs`.
- QA: `soffice --convert-to pdf` + `pdftoppm -jpeg -r 150`.

## What I need from you before starting
**Confirm one** so I know how to get into the dashboard:
- (A) The browser session might already be logged in via the published domain — I'll try first; if it fails I'll stop and ask.
- (B) You give me a test admin login (email + password + 2FA off if possible) to use.
- (C) You upload the dashboard screenshots yourself and I just assemble the deck.
