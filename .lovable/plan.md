## AI Pastor Assistant

A chat page where an admin/pastor asks natural-language questions and the AI answers using **live data from your database**, not guesses.

### How it works

```text
Pastor types question
   -> Edge function "ai-pastor-assistant"
      -> AI model (Lovable AI, no API key needed)
         -> calls read-only tools (attendance, members, donations, ...)
            -> queries DB as the signed-in user (RLS enforced)
         -> AI writes the answer in the user's language (EN/FR/HT)
   -> Streamed back into the chat UI
```

The key part is **tool calling**: the AI never invents numbers. It calls a small set of typed data tools and only summarizes what comes back.

### Tools the assistant gets

| Tool | Answers questions like |
| --- | --- |
| `get_absent_members` | "Who missed the last four Sundays?" |
| `get_visitors` | "Show first-time visitors this month" |
| `get_lapsed_givers` | "Who hasn't given in six months?" |
| `get_birthdays` | "Who has a birthday this week?" |
| `get_financial_summary` | "Generate a monthly financial summary" |
| `get_ministry_growth` | "Which ministry is growing fastest?" |
| `get_engagement_insights` | Reuses existing engagement/risk scores |

Each tool is a narrow, parameterized query (date range + limit). No free-form SQL.

### Scope and access

- New page `/ai-assistant`, visible only to roles with member + finance visibility (admin, pastor; treasurer sees finance tools only).
- Finance tools are omitted from the tool list when the caller lacks finance permission, so the AI cannot reveal giving data to a role that shouldn't see it.
- Gated by a new global feature flag `ai_assistant` in Platform Settings (so you can kill it), and by plan tier via the existing feature-gating system.
- Everything is tenant-scoped: the function forwards the user's token, so RLS returns only their church's rows.

### Conversation history

One conversation per user, kept in the browser only (no new tables), with a "New conversation" button. If you'd rather have saved threads with history in the database, say so and I'll build that instead.

### UI

- Chat page matching the app's design system, with suggested starter questions (the six examples above) as clickable chips.
- Streaming answers with markdown rendering, plus a compact result table when a tool returns a member/donation list, and an export-to-CSV button on those results.
- Trilingual: the assistant replies in the UI language (EN/FR/HT), with all labels added to `LanguageContext`.

### Technical details

- Edge function `supabase/functions/ai-pastor-assistant/index.ts` using the AI SDK (`streamText`, `tool`, `stepCountIs(50)`) against the Lovable AI Gateway with `google/gemini-3.6-flash`. No API key from you; usage draws on workspace AI credits.
- Tools query existing tables: `attendance_records`, `members`, `visitors`, `donations`, `expenses`, `ministry_members`, `member_engagement_scores`.
- "Missed last N Sundays" is computed by listing the past N Sunday service dates and finding active members with no attendance row on any of them.
- Dates handled with the existing `parseDateOnly` helper to avoid timezone shifts; currency formatted via the existing currency helpers.
- Errors surfaced explicitly in the UI: 429 (rate limited) and 402 (credits exhausted) get their own messages.
- Feature flag added to `PlatformSettings.tsx`; route wrapped in `GlobalFeatureGate`; nav item added in `Layout.tsx`.
- New permission key `ai_assistant` added to `src/lib/permissions.ts` so tenant admins can grant it per custom role.
