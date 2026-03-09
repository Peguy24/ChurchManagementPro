

## Plan: Record scan time and show early/late attendance status

### Database
- Add migration: `ALTER TABLE attendance_records ALTER COLUMN marked_at SET DEFAULT now();`

### Code changes

**1. Record `marked_at` on insert**
- `src/pages/Attendance.tsx`: Add `marked_at: new Date().toISOString()` to attendance insert
- `src/pages/AttendanceKiosk.tsx`: Same

**2. Early/Late logic (helper function)**
Compare `marked_at` against event `event_time`:
- **Early**: arrived > 5 min before event start
- **On time**: arrived within 5 min before to 15 min after event start
- **Late**: arrived > 15 min after event start
- No `event_time` → show scan time only, no status badge

**3. UI — Attendance page & Kiosk**
- Show scan time and colored badge (green=early, blue=on-time, red=late) in scanned members list
- Kiosk feedback card: show arrival time + status after successful scan

**4. UI — MemberAttendanceStats**
- Fetch `marked_at` in query, display scan time in stats

**5. Translations (FR/EN/HT)**
- `attendance.scanTime`: "Heure du scan" / "Scan Time" / "Lè eskanaj"
- `attendance.early`: "En avance" / "Early" / "Bonè"
- `attendance.onTime`: "À l'heure" / "On Time" / "Alè"
- `attendance.late`: "En retard" / "Late" / "An reta"
- `attendance.arrivalStatus`: "Statut d'arrivée" / "Arrival Status" / "Estati arive"

**6. Backup export**
- Update `src/lib/backupExportConfig.ts` to include and format `marked_at` as HH:MM:SS

