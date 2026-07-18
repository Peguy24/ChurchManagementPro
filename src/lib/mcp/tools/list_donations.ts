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
  name: "list_donations",
  title: "List donations",
  description:
    "List donations recorded for the signed-in user's church. Row-level security limits results to what the user is allowed to see. Only accessible to roles with finance access (admin, pastor, treasurer).",
  inputSchema: {
    from_date: z.string().optional().describe("Optional ISO date (YYYY-MM-DD). Only donations on or after this date."),
    to_date: z.string().optional().describe("Optional ISO date (YYYY-MM-DD). Only donations on or before this date."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from_date, to_date, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("donations")
      .select("id, amount, currency, donation_date, category_id, member_id, payment_method, notes, created_at")
      .order("donation_date", { ascending: false })
      .limit(limit ?? 50);

    if (from_date) query = query.gte("donation_date", from_date);
    if (to_date) query = query.lte("donation_date", to_date);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const total = (data ?? []).reduce((sum, r: any) => sum + Number(r.amount || 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { donations: data ?? [], count: data?.length ?? 0, total_amount: total },
    };
  },
});
