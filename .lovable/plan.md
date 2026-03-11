

## Problem

When some rows fail during import, the user must re-upload the entire file to retry. This creates **duplicates** for the rows that already succeeded the first time.

## Solution

Two complementary fixes:

### 1. Duplicate Detection Before Insert
Before inserting each row, check if a member with the same `first_name + last_name + tenant_id` (and optionally `email`) already exists. If a match is found, **skip** that row and count it as "already exists" rather than inserting a duplicate.

Logic:
- For each row, query `members` table for matching `first_name`, `last_name`, and `tenant_id`
- If email is provided, also match on email for stronger dedup
- If found → skip and add to a "skipped (duplicate)" list
- If not found → insert normally

### 2. Show Failed Rows After Import & Allow Retry
After import completes, if some rows failed:
- Stay on the dialog instead of closing it
- Display a summary: "X imported, Y skipped (duplicates), Z failed"
- Filter `parsedRows` to keep only the failed rows
- Let the user click "Retry Failed Rows" without re-uploading the file

### Files to modify
- **`src/components/MemberImportDialog.tsx`**:
  - Add duplicate-check query before each insert
  - Track skipped/duplicate rows separately from failed rows
  - After import, if failures exist: keep dialog open, show failed rows, offer retry button
  - Update toast messages to show duplicates skipped count

