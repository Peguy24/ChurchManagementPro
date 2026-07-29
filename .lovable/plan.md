## Self Check-In

Members scan a QR shown on a screen at the entrance and mark their own attendance from their phone. No app install, no login.

### How it works

```text
[Display screen]                    [Member phone]
Admin opens a check-in       -->    Scans QR with camera
session for an event                    |
QR refreshes every 45s              Opens /checkin/<token>
(signed rotating token)                 |
                                    Phone asks for location
                                        |
                                    Identify:
                                    (a) member number or phone
                                    (b) scan my member card QR
                                        |
                                    "Welcome, Marie — you're checked in"
                                    (appears live on the display screen)
```

### 1. Check-in session (manual open/close)

- New "Self Check-In" action on each event, plus a full-screen display page (`/attendance/self-checkin/:eventId`) meant for a projector or tablet at the door.
- The admin presses **Start check-in**; the screen captures the venue GPS coordinates once (from the display device) and stores them with the session. It shows the event name, the rotating QR, a live counter, and the last few names checked in.
- Pressing **Stop check-in** closes the session; scans after that are refused with a clear message.

### 2. Rotating QR + location check

- The QR encodes a short-lived signed token (event + session + timestamp, HMAC-signed server-side) that is regenerated every 45 seconds. A screenshot forwarded to someone at home expires almost immediately.
- Old tokens stay valid for one extra cycle so a slow scanner still works.
- The member's browser is asked for location. If it is more than a configurable radius (default 200 m) from the venue coordinates, check-in is refused with "You must be at the church to check in". If the member denies location permission, the check-in is still recorded but flagged as **unverified location** so admins can see it in the attendance list.

### 3. Identifying the member

Two paths on the check-in page:

- **Member number or phone** — they type it, the page shows the matching name masked (e.g. "Marie D."), they confirm. Only exact matches within that church are accepted; no member list is ever exposed.
- **Scan my member card** — the phone camera reads their personal member QR card, which auto-fills the identity step.

Wrong or unknown numbers give a generic "We couldn't find you — see a greeter" message, with a per-device attempt limit to stop guessing.

### 4. The attendance record

- Saved into the existing attendance table with `scan_method = 'self_checkin'`, linked to the event, dated to the event day, with `marked_by` left empty (self-recorded).
- Duplicate check-ins for the same member and event are ignored gracefully ("You're already checked in").
- These records show up everywhere attendance already does: attendance list, arrival punctuality (early / on time / late), stats and reports. A "Self" badge distinguishes them.

### 5. Admin controls

- Enable or disable self check-in per church in Attendance settings, with the radius and whether location is mandatory or optional.
- Role permission `attendance.self_checkin_manage` for who can open/close sessions, added to the existing role permission screens.
- Everything trilingual (EN / FR / HT), including the member-facing page, which follows the church logo and colors.

### Technical notes

- New tables: `self_checkin_sessions` (event, tenant, opened/closed timestamps, venue lat/lng, radius, secret) and a `location_verified` + `self_checkin_session_id` addition to attendance records.
- The public check-in page is unauthenticated, so all validation happens in a new edge function `self-checkin` (token signature and freshness, session open, member lookup scoped to the session's tenant, distance calculation, duplicate guard, rate limiting). No direct table access from the public page — a pattern already used by the public giving page.
- The display screen subscribes to realtime inserts so names appear as people check in.
- Offline note: self check-in needs internet on the member's phone; the existing offline kiosk scanning stays as the fallback when the venue has no connection.
