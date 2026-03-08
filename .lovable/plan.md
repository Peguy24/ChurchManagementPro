

## Plan: Replace Date of Birth with Ministry on Member Cards

### What Changes
Two files need updating:

1. **`src/lib/memberCardPDF.ts`** -- The PDF generation logic
   - Add `ministry` field to the `MemberCardData` interface
   - Replace the "Né(e) le:" (date of birth) line with "Ministère:" showing the member's ministry name

2. **`src/pages/MemberCards.tsx`** -- The data query and interface
   - Update the `Member` interface to include `ministry` (remove `date_of_birth` from the interface or keep it unused)
   - Update the Supabase query to join `ministry_members` and `ministries` tables to fetch the member's ministry name
   - Pass the ministry name through to the PDF generator

### Query Change
The current query:
```sql
select("id, first_name, last_name, qr_code, photo_url, phone, email, role, baptism_status, date_of_birth, join_date, member_number")
```
Will become:
```sql
select("id, first_name, last_name, qr_code, photo_url, phone, email, role, baptism_status, date_of_birth, join_date, member_number, ministry_members(ministries(name))")
```
The first ministry found will be used as the display value. If a member belongs to multiple ministries, the first one is shown.

### PDF Card Layout Change
- Line currently showing `Né(e) le: 01/01/1990` will show `Ministère: Louange` (or "Non défini" if no ministry)
- All other card elements remain unchanged

