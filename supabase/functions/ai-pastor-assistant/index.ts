import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "npm:ai@^7.0.37";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@^3.0.14";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@^4.4.3";
import {
  createScopedQuery,
  guarded,
  QueryDenied,
  safeDate,
  safeIds,
  setDenialLogger,
  type Ctx,
  type Scope,
} from "./validation.ts";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

// ---------- helpers ----------

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Returns the last `count` Sunday dates (YYYY-MM-DD), most recent first. */
function lastSundays(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  // move back to the most recent Sunday (today counts if it is Sunday)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  for (let i = 0; i < count; i++) {
    out.push(ymd(d));
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return out;
}

function fullName(m: { first_name?: string | null; last_name?: string | null }) {
  return [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
}

function monthDay(dateStr: string) {
  // date_of_birth is a plain date string, avoid timezone shifts
  const [, mm, dd] = dateStr.split("T")[0].split("-");
  return `${mm}-${dd}`;
}

function errText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ---------- server-side query validation ----------
// Implementation lives in ./validation.ts so it can be unit-tested directly.


// ---------- tool builders ----------

function buildTools(ctx: Ctx) {
  const scoped = createScopedQuery(ctx);
  const canSeeFinance = ctx.scopes.has("finance");

  const memberTools = {
    get_absent_members: tool({
      description:
        "List active members who did not attend any of the last N Sunday services. Use for questions like 'who missed the last four Sundays?'.",
      inputSchema: z
        .object({
          sundays: z.number().int().min(1).max(12).default(4).describe("How many recent Sundays to check."),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .strict(),
      execute: guarded("get_absent_members", async ({ sundays, limit }) => {
        const dates = lastSundays(sundays);
        const oldest = dates[dates.length - 1];

        const membersQ = scoped("members", ["id", "first_name", "last_name", "phone", "email"]);
        const attQ = scoped("attendance_records", ["member_id", "event_date"], { limit: 5000 });

        const [{ data: members, error: mErr }, { data: att, error: aErr }] = await Promise.all([
          membersQ.query.eq(membersQ.assertFilter("status"), "active"),
          attQ.query.gte(attQ.assertFilter("event_date"), safeDate(oldest, "oldest Sunday")),
        ]);
        if (mErr) return { error: mErr.message };
        if (aErr) return { error: aErr.message };

        const dateSet = new Set(dates);
        const present = new Set(
          (att ?? [])
            .filter((r: any) => r.event_date && dateSet.has(String(r.event_date).slice(0, 10)))
            .map((r: any) => r.member_id),
        );
        const absent = (members ?? []).filter((m: any) => !present.has(m.id));
        return {
          sundays_checked: dates,
          total_active_members: members?.length ?? 0,
          absent_count: absent.length,
          members: absent.slice(0, limit).map((m: any) => ({
            name: fullName(m),
            phone: m.phone,
            email: m.email,
          })),
        };
      }),
    }),

    get_visitors: tool({
      description:
        "List visitors (first-time guests) recorded in a date range, with their follow-up status.",
      inputSchema: z
        .object({
          from_date: z.string().nullable().default(null).describe("ISO date YYYY-MM-DD, inclusive."),
          to_date: z.string().nullable().default(null).describe("ISO date YYYY-MM-DD, inclusive."),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .strict(),
      execute: guarded("get_visitors", async ({ from_date, to_date, limit }) => {
        const v = scoped(
          "visitors",
          [
            "first_name",
            "last_name",
            "phone",
            "email",
            "visit_date",
            "how_heard",
            "follow_up_status",
            "converted_to_member_id",
          ],
          { limit },
        );
        let q = v.query.order("visit_date", { ascending: false });
        if (from_date) q = q.gte(v.assertFilter("visit_date"), safeDate(from_date, "from_date"));
        if (to_date) q = q.lte(v.assertFilter("visit_date"), safeDate(to_date, "to_date"));
        if (from_date && to_date && from_date > to_date) {
          throw new QueryDenied("from_date must be earlier than or equal to to_date.");
        }
        const { data, error } = await q;
        if (error) return { error: error.message };
        return {
          count: data?.length ?? 0,
          visitors: (data ?? []).map((v: any) => ({
            name: fullName(v),
            phone: v.phone,
            email: v.email,
            visit_date: v.visit_date,
            how_heard: v.how_heard,
            follow_up_status: v.follow_up_status,
            became_member: !!v.converted_to_member_id,
          })),
        };
      }),
    }),

    get_birthdays: tool({
      description: "List active members whose birthday falls in the next N days (default 7).",
      inputSchema: z
        .object({
          days: z.number().int().min(1).max(90).default(7),
        })
        .strict(),
      execute: guarded("get_birthdays", async ({ days }) => {
        const m = scoped("members", ["first_name", "last_name", "phone", "email", "date_of_birth"]);
        const { data, error } = await m.query
          .eq(m.assertFilter("status"), "active")
          .not(m.assertFilter("date_of_birth"), "is", null);
        if (error) return { error: error.message };

        const window: string[] = [];
        const d = new Date();
        d.setUTCHours(12, 0, 0, 0);
        for (let i = 0; i < days; i++) {
          window.push(ymd(d).slice(5));
          d.setUTCDate(d.getUTCDate() + 1);
        }
        const set = new Set(window);
        const hits = (data ?? [])
          .filter((m: any) => set.has(monthDay(String(m.date_of_birth))))
          .sort((a: any, b: any) => window.indexOf(monthDay(String(a.date_of_birth))) - window.indexOf(monthDay(String(b.date_of_birth))));
        return {
          days,
          count: hits.length,
          members: hits.map((m: any) => ({
            name: fullName(m),
            date_of_birth: String(m.date_of_birth).slice(0, 10),
            phone: m.phone,
            email: m.email,
          })),
        };
      }),
    }),

    get_ministry_growth: tool({
      description:
        "Compare ministry membership growth over the last N months. Returns each ministry with its total members and how many joined in the period.",
      inputSchema: z
        .object({
          months: z.number().int().min(1).max(24).default(6),
        })
        .strict(),
      execute: guarded("get_ministry_growth", async ({ months }) => {
        const cutoff = new Date();
        cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
        const cutoffStr = safeDate(ymd(cutoff), "cutoff");

        const { data: ministries, error: minErr } = await scoped("ministries", ["id", "name", "status"]).query;
        if (minErr) return { error: minErr.message };
        const ids = safeIds((ministries ?? []).map((m: any) => m.id), "ministry ids");
        if (ids.length === 0) return { months, ministries: [] };

        const mm = scoped("ministry_members", ["ministry_id", "joined_date"], { limit: 5000 });
        const { data: links, error: linkErr } = await mm.query.in(mm.assertFilter("ministry_id"), ids);
        if (linkErr) return { error: linkErr.message };

        const rows = (ministries ?? []).map((m: any) => {
          const mine = (links ?? []).filter((l: any) => l.ministry_id === m.id);
          const recent = mine.filter((l: any) => l.joined_date && String(l.joined_date).slice(0, 10) >= cutoffStr);
          const before = mine.length - recent.length;
          return {
            ministry: m.name,
            status: m.status,
            total_members: mine.length,
            joined_last_period: recent.length,
            growth_rate_percent: before > 0 ? Math.round((recent.length / before) * 100) : null,
          };
        });
        rows.sort((a, b) => b.joined_last_period - a.joined_last_period);
        return { months, since: cutoffStr, ministries: rows };
      }),
    }),

    get_engagement_insights: tool({
      description:
        "Return existing engagement scores and churn-risk predictions for members (already computed by the platform). Use for 'who is at risk of leaving' or 'who are our most engaged members'.",
      inputSchema: z
        .object({
          mode: z.enum(["top_engaged", "least_engaged", "at_risk"]).default("at_risk"),
          limit: z.number().int().min(1).max(50).default(15),
        })
        .strict(),
      execute: guarded("get_engagement_insights", async ({ mode, limit }) => {
        if (mode === "at_risk") {
          const { data, error } = await scoped(
            "member_risk_predictions",
            [
              "risk_probability",
              "risk_category",
              "days_since_last_attendance",
              "contributing_factors",
              "members(first_name, last_name)",
            ],
            { limit },
          ).query.order("risk_probability", { ascending: false });
          if (error) return { error: error.message };
          return {
            mode,
            members: (data ?? []).map((r: any) => ({
              name: r.members ? fullName(r.members) : null,
              risk_probability: r.risk_probability,
              risk_category: r.risk_category,
              days_since_last_attendance: r.days_since_last_attendance,
              factors: r.contributing_factors,
            })),
          };
        }
        const { data, error } = await scoped(
          "member_engagement_scores",
          [
            "total_score",
            "attendance_score",
            "giving_score",
            "ministry_score",
            "trend",
            "members(first_name, last_name)",
          ],
          { limit },
        ).query.order("total_score", { ascending: mode === "least_engaged" });
        if (error) return { error: error.message };
        return {
          mode,
          members: (data ?? []).map((r: any) => ({
            name: r.members ? fullName(r.members) : null,
            total_score: r.total_score,
            attendance_score: r.attendance_score,
            giving_score: r.giving_score,
            ministry_score: r.ministry_score,
            trend: r.trend,
          })),
        };
      }),
    }),
  };

  if (!canSeeFinance) return memberTools;

  const financeTools = {
    get_lapsed_givers: tool({
      description:
        "List active members who have not given any donation in the last N months (default 6). Also reports how many have never given.",
      inputSchema: z
        .object({
          months: z.number().int().min(1).max(36).default(6),
          limit: z.number().int().min(1).max(200).default(100),
        })
        .strict(),
      execute: guarded("get_lapsed_givers", async ({ months, limit }) => {
        const cutoff = new Date();
        cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
        const cutoffStr = safeDate(ymd(cutoff), "cutoff");

        const m = scoped("members", ["id", "first_name", "last_name", "phone", "email"]);
        const d = scoped("donations", ["member_id", "donation_date", "amount"], { limit: 5000 });

        const [{ data: members, error: mErr }, { data: donations, error: dErr }] = await Promise.all([
          m.query.eq(m.assertFilter("status"), "active"),
          d.query,
        ]);
        if (mErr) return { error: mErr.message };
        if (dErr) return { error: dErr.message };

        const recent = new Set(
          (donations ?? [])
            .filter((d: any) => d.member_id && String(d.donation_date).slice(0, 10) >= cutoffStr)
            .map((d: any) => d.member_id),
        );
        const ever = new Set((donations ?? []).filter((d: any) => d.member_id).map((d: any) => d.member_id));
        const lapsed = (members ?? []).filter((m: any) => !recent.has(m.id));
        return {
          months,
          since: cutoffStr,
          lapsed_count: lapsed.length,
          never_given_count: lapsed.filter((m: any) => !ever.has(m.id)).length,
          members: lapsed.slice(0, limit).map((m: any) => ({
            name: fullName(m),
            phone: m.phone,
            email: m.email,
            has_ever_given: ever.has(m.id),
          })),
        };
      }),
    }),

    get_financial_summary: tool({
      description:
        "Financial summary for a date range: total donations, total expenses, net, breakdown by donation type and by payment method, plus top expense categories.",
      inputSchema: z
        .object({
          from_date: z.string().describe("ISO date YYYY-MM-DD, inclusive."),
          to_date: z.string().describe("ISO date YYYY-MM-DD, inclusive."),
        })
        .strict(),
      execute: guarded("get_financial_summary", async ({ from_date, to_date }) => {
        const from = safeDate(from_date, "from_date");
        const to = safeDate(to_date, "to_date");
        if (from > to) throw new QueryDenied("from_date must be earlier than or equal to to_date.");

        const d = scoped("donations", ["amount", "donation_type", "payment_method", "donation_date"], { limit: 5000 });
        const e = scoped("expenses", ["amount", "status", "expense_date", "category_id", "description"], { limit: 5000 });

        const [{ data: donations, error: dErr }, { data: expenses, error: eErr }] = await Promise.all([
          d.query.gte(d.assertFilter("donation_date"), from).lte(d.assertFilter("donation_date"), to),
          e.query.gte(e.assertFilter("expense_date"), from).lte(e.assertFilter("expense_date"), to),
        ]);
        if (dErr) return { error: dErr.message };
        if (eErr) return { error: eErr.message };

        const sum = (rows: any[]) => rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const byKey = (rows: any[], key: string) => {
          const map: Record<string, number> = {};
          for (const r of rows) {
            const k = r[key] || "unspecified";
            map[k] = (map[k] || 0) + Number(r.amount || 0);
          }
          return map;
        };

        const approvedExpenses = (expenses ?? []).filter((e: any) => e.status !== "rejected");
        const totalIn = sum(donations ?? []);
        const totalOut = sum(approvedExpenses);

        const categories: Record<string, number> = {};
        const catIds = safeIds(
          [...new Set(approvedExpenses.map((e: any) => e.category_id).filter(Boolean))],
          "expense category ids",
        );
        if (catIds.length) {
          const c = scoped("expense_categories", ["id", "name"], { limit: catIds.length });
          const { data: cats } = await c.query.in(c.assertFilter("id"), catIds);
          const names = Object.fromEntries((cats ?? []).map((c: any) => [c.id, c.name]));
          for (const e of approvedExpenses) {
            const k = names[e.category_id] || "unspecified";
            categories[k] = (categories[k] || 0) + Number(e.amount || 0);
          }
        }

        return {
          period: { from, to },
          total_donations: totalIn,
          donations_count: donations?.length ?? 0,
          total_expenses: totalOut,
          expenses_count: approvedExpenses.length,
          net: totalIn - totalOut,
          donations_by_type: byKey(donations ?? [], "donation_type"),
          donations_by_payment_method: byKey(donations ?? [], "payment_method"),
          expenses_by_category: categories,
        };
      }),
    }),
  };

  return { ...memberTools, ...financeTools };
}

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI is not configured on this server." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-scoped client: every query below runs under RLS as the signed-in user.
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const messages: UIMessage[] = body?.messages ?? [];
    const language: string = body?.language === "fr" || body?.language === "ht" ? body.language : "en";

    // Tenant scope is resolved server-side only — never taken from the request body.
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    const tenantId: string | null = profile?.tenant_id ?? null;

    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role as string);

    // Cross-check the tenant membership actually granted to this user.
    const { data: tenantRoles } = await supabase
      .from("tenant_user_roles")
      .select("role, tenant_id, is_approved")
      .eq("user_id", user.id)
      .eq("is_approved", true);
    const approvedTenantRoles = (tenantRoles ?? []).filter((r: any) => r.tenant_id === tenantId);
    const allRoles = [...roles, ...approvedTenantRoles.map((r: any) => r.role as string)];

    const canSeeFinance = allRoles.some((r) => ["admin", "treasurer", "pastor"].includes(r));
    const canSeeMembers = allRoles.some((r) => ["admin", "pastor", "treasurer", "secretary"].includes(r));

    if (!tenantId || (!canSeeMembers && !canSeeFinance)) {
      return new Response(JSON.stringify({ error: "You do not have access to this assistant." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopes = new Set<Scope>();
    if (canSeeMembers) scopes.add("members");
    if (canSeeFinance) scopes.add("finance");

    const ctx: Ctx = { supabase, userId: user.id, tenantId, scopes };

    // Structured audit trail: every denied tool call is persisted for admins.
    setDenialLogger(async (event) => {
      await supabase.from("ai_tool_denials").insert({
        tenant_id: tenantId,
        user_id: user.id,
        roles: allRoles,
        tool_name: event.toolName,
        rule: event.rule,
        table_name: event.table ?? null,
        column_name: event.column ?? null,
        required_scope: event.requiredScope ?? null,
        message: event.message,
        args: event.args ?? null,
      });
    });


    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": apiKey },
    });

    const langName = language === "fr" ? "French" : language === "ht" ? "Haitian Creole" : "English";
    const today = ymd(new Date());

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .maybeSingle();
    const tenantName: string = tenantRow?.name ?? "this church";

    const system = buildSystemPrompt({ tenantName, langName, today, canSeeFinance });



    const result = streamText({
      model: gateway("google/gemini-3.6-flash"),
      system,
      messages: await convertToModelMessages(messages),
      tools: buildTools(ctx),
      stopWhen: stepCountIs(50),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (e) {
    console.error("ai-pastor-assistant error", e);
    return new Response(JSON.stringify({ error: errText(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
