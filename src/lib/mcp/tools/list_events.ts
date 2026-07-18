import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_events",
  title: "List church events",
  description:
    "List events for the signed-in user's church. Row-level security limits results. Optionally filter to upcoming events only.",
  inputSchema: {
    upcoming_only: z.boolean().optional().describe("If true, only return events with a start date in the future."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ upcoming_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select("id, title, description, event_date, end_date, location, event_type, status")
      .order("event_date", { ascending: false })
      .limit(limit ?? 50);

    if (upcoming_only) {
      query = query.gte("event_date", new Date().toISOString());
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [], count: data?.length ?? 0 },
    };
  },
});
