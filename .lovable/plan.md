

## Plan: Create Sales PPTX Presentations + Super Admin Download

### What we're building

1. **Two downloadable .pptx files** (FR + EN) — professional sales presentations with screenshots of the system to convince church leaders
2. **A "Download Presentation" button** in the Super Admin Quick Actions section

### Presentation Content (12-14 slides)

| # | Slide | Visual |
|---|-------|--------|
| 1 | Title slide — "Church Management Pro" | Logo + hero image |
| 2 | The Problem — manual processes, paper, spreadsheets | Icon grid |
| 3 | The Solution — all-in-one platform | Screenshot of Dashboard |
| 4 | Member Management | Screenshot of Members page |
| 5 | Attendance & QR Code | Screenshot of Attendance page |
| 6 | Financial Management | Screenshot of Donations/Financial Dashboard |
| 7 | Events & Ministries | Screenshot of Events page |
| 8 | Multi-Branch Management | Screenshot of Branches page |
| 9 | Reports & Smart Insights | Screenshot of Reports page |
| 10 | Security & Roles | Key points with icons |
| 11 | Pricing Plans | 3-column comparison |
| 12 | Call to Action — "Get Started Today" | Contact info |

### Screenshots approach

Since we can't take live screenshots at PPTX generation time on the client, we will:
- Take screenshots of key pages now using browser tools
- Store them as static assets in `public/screenshots/`
- The PPTX generator script will embed them as base64 images

### Technical details

**Step 1 — Capture screenshots** of ~8 key pages (Dashboard, Members, Attendance, Donations, Events, Branches, Reports, Financial Dashboard) and save to `public/screenshots/`

**Step 2 — Create PPTX generator script** using `pptxgenjs` (Node.js) that:
- Builds a professional dark-themed presentation
- Embeds screenshots on feature slides
- Generates two files: `presentation_fr.pptx` and `presentation_en.pptx`
- Saves to `public/presentations/`

**Step 3 — Add download in Super Admin**
- Add a new Quick Action button with `FileText` icon: "Download Sales Presentation"
- On click, opens a small dialog to pick language (FR/EN), then triggers download of the corresponding `.pptx` from `public/presentations/`

### Files to create/modify
- `public/screenshots/` — 8 screenshot images
- `public/presentations/` — 2 generated .pptx files
- `src/pages/SuperAdminDashboard.tsx` — add Quick Action button + download logic

