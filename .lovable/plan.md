

## Problem

The bulk announcement sends only 2 out of 8 emails successfully. The edge function logs show **6 emails getting 429 rate-limited** by Resend's 2 req/sec limit. The current delay logic (`if (i > 0 && i % 2 === 0)`) only pauses every 2nd email, but all requests still fire too fast.

## Root Cause

The `await fetch()` calls are sequential but complete very quickly (< 100ms each), so emails 0, 1, 2 can all fire within the same second. The delay only triggers at indices 2, 4, 6 -- meaning emails at indices 0 and 1 always fire without delay, and the subsequent delays aren't large enough to recover from the burst.

## Fix

Modify `supabase/functions/send-bulk-announcement/index.ts` to add a **600ms delay before every single email** (except the first). This ensures no more than ~1.6 emails/sec, safely under Resend's 2/sec limit.

```text
Current logic:
  email 0 → send immediately
  email 1 → send immediately (too fast!)
  email 2 → wait 1100ms, send
  email 3 → send immediately (too fast!)
  ...

Fixed logic:
  email 0 → send immediately
  email 1 → wait 600ms, send
  email 2 → wait 600ms, send
  ...
```

### Change in edge function (1 file)

**`supabase/functions/send-bulk-announcement/index.ts`** -- Replace the rate limiting block:
- Change `if (i > 0 && i % 2 === 0)` to `if (i > 0)`
- Change delay from `1100` to `600`

This guarantees at most ~1.6 requests/second, well within Resend's limit, and all 8 emails will be delivered.

