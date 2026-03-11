

## Problem

Members can only have 3 statuses (active, inactive, transferred). There's no way to mark a member as deceased, and no way to soft-delete (archive) a member from the active list. Users also cannot change status or delete members directly from the member list or details page without opening the full edit dialog.

## Plan

### 1. Add new statuses: "deceased" and "archived"

**Files: `src/components/MemberDialog.tsx`, `src/pages/Members.tsx`, `src/pages/MemberDetails.tsx`**

- Add `deceased` and `archived` as new status options in the status `Select` dropdown in `MemberDialog.tsx`
- Add corresponding status colors in `statusColors` maps in all 3 files
- Add `getStatusLabel` handling for the new statuses

### 2. Add status change and soft-delete actions to Members list

**File: `src/pages/Members.tsx`**

- Add a dropdown menu (or additional action buttons) per member row with:
  - "Change Status" submenu → active / inactive / transferred / deceased
  - "Archive" option → sets status to `archived`
- Archived and deceased members are hidden from the default list view
- Add a filter/toggle to show archived/deceased members if needed
- Add confirmation dialog (AlertDialog) before marking as deceased or archiving

### 3. Add status change and archive actions to MemberDetails page

**File: `src/pages/MemberDetails.tsx`**

- Add action buttons in the header area: "Change Status" dropdown and "Archive Member" button
- Confirmation dialog for destructive actions (deceased/archive)
- After status change, reload member details

### 4. Filter default member list to exclude deceased/archived

**File: `src/pages/Members.tsx`**

- Default query filters out `deceased` and `archived` statuses
- Add a toggle/checkbox "Show archived/deceased" to include them when needed
- Update member count to reflect only active members by default

### 5. Add translations for all 3 languages

**File: `src/contexts/LanguageContext.tsx`** + local translation maps in `MemberDialog.tsx`, `MemberDetails.tsx`

Add keys for:
- `deceased` / `archived` status labels
- `archiveMember` / `markDeceased` action labels  
- Confirmation dialog text (title, description, confirm/cancel)
- "Show archived" toggle label
- Toast messages for status changes

| Key | FR | EN | HT |
|-----|----|----|-----|
| deceased | Décédé | Deceased | Desede |
| archived | Archivé | Archived | Achive |
| archiveMember | Archiver le membre | Archive Member | Achive Manm |
| markDeceased | Marquer comme décédé | Mark as Deceased | Make kòm Desede |
| confirmArchive | Êtes-vous sûr de vouloir archiver ce membre ? | Are you sure you want to archive this member? | Èske ou sèten ou vle achive manm sa a? |
| confirmDeceased | Êtes-vous sûr de vouloir marquer ce membre comme décédé ? | Are you sure you want to mark this member as deceased? | Èske ou sèten ou vle make manm sa a kòm desede? |
| showArchived | Afficher archivés/décédés | Show archived/deceased | Montre achive/desede |

### Summary of changes

```text
MemberDialog.tsx
  └─ Add "deceased" and "archived" to status Select + translations

Members.tsx
  └─ Filter out deceased/archived by default
  └─ Add "Show archived" toggle
  └─ Add per-row dropdown with status change + archive actions
  └─ Add confirmation dialogs
  └─ Update statusColors map

MemberDetails.tsx
  └─ Add status change + archive buttons in header
  └─ Add confirmation dialogs
  └─ Update statusColors map

LanguageContext.tsx
  └─ Add translation keys for new statuses and actions
```

