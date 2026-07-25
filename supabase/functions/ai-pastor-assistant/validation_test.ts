import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createScopedQuery,
  guarded,
  QUERY_POLICY,
  QueryDenied,
  safeDate,
  safeIds,
  type Ctx,
  type Scope,
  type TableName,
} from "./validation.ts";

// ---------- minimal fake Supabase client (records what was built) ----------

type Call = { fn: string; args: unknown[] };

function fakeClient() {
  const calls: Call[] = [];
  const builder: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") return undefined; // not a thenable
        return (...args: unknown[]) => {
          calls.push({ fn: prop, args });
          return builder;
        };
      },
    },
  );
  const supabase: any = {
    from(table: string) {
      calls.push({ fn: "from", args: [table] });
      return builder;
    },
  };
  return { supabase, calls };
}

function ctxWith(scopes: Scope[]): Ctx {
  const { supabase } = fakeClient();
  return { supabase, userId: "user-1", tenantId: "tenant-1", scopes: new Set(scopes) };
}

const bothScopes: Scope[] = ["members", "finance"];

// ---------- table allow-list ----------

Deno.test("denies tables outside the allow-list", () => {
  const scoped = createScopedQuery(ctxWith(bothScopes));
  for (const table of ["profiles", "user_roles", "tenants", "auth.users", "platform_settings", ""]) {
    assertThrows(() => scoped(table as TableName, ["id"]), QueryDenied);
  }
});

// ---------- column allow-list ----------

Deno.test("denies columns that are not readable on an allow-listed table", () => {
  const scoped = createScopedQuery(ctxWith(bothScopes));
  const disallowed: Array<[TableName, string]> = [
    ["members", "tenant_id"],
    ["members", "notes"],
    ["members", "*"],
    ["members", "id, tenant_id"],
    ["donations", "stripe_payment_intent_id"],
    ["visitors", "created_by"],
    ["expenses", "created_by"],
  ];
  for (const [table, column] of disallowed) {
    assertThrows(() => scoped(table, [column]), QueryDenied, "is not readable");
  }
});

Deno.test("allows only the exact policy columns", () => {
  const scoped = createScopedQuery(ctxWith(bothScopes));
  for (const [table, policy] of Object.entries(QUERY_POLICY)) {
    scoped(table as TableName, [...policy.columns]); // must not throw
  }
});

// ---------- filter allow-list ----------

Deno.test("denies filters that are not declared for the table", () => {
  const scoped = createScopedQuery(ctxWith(bothScopes));
  const disallowed: Array<[TableName, string]> = [
    ["members", "tenant_id"],
    ["members", "id"],
    ["members", "email"],
    ["donations", "member_id"],
    ["donations", "amount"],
    ["attendance_records", "member_id"],
    ["ministries", "status"],
    ["member_engagement_scores", "total_score"],
    ["expenses", "status"],
  ];
  for (const [table, column] of disallowed) {
    const q = scoped(table, [...QUERY_POLICY[table].columns]);
    assertThrows(() => q.assertFilter(column), QueryDenied, "is not permitted");
  }
});

Deno.test("permits declared filters", () => {
  const scoped = createScopedQuery(ctxWith(bothScopes));
  assertEquals(scoped("members", ["id"]).assertFilter("status"), "status");
  assertEquals(scoped("donations", ["amount"]).assertFilter("donation_date"), "donation_date");
  assertEquals(scoped("expense_categories", ["id"]).assertFilter("id"), "id");
});

// ---------- role scope enforcement ----------

Deno.test("members-only role cannot read finance tables", () => {
  const scoped = createScopedQuery(ctxWith(["members"]));
  for (const table of ["donations", "expenses", "expense_categories"] as TableName[]) {
    assertThrows(() => scoped(table, [...QUERY_POLICY[table].columns]), QueryDenied, "not allowed to read");
  }
});

Deno.test("finance-only role cannot read member tables", () => {
  const scoped = createScopedQuery(ctxWith(["finance"]));
  for (const table of ["members", "visitors", "attendance_records", "member_risk_predictions"] as TableName[]) {
    assertThrows(() => scoped(table, [...QUERY_POLICY[table].columns]), QueryDenied, "not allowed to read");
  }
});

Deno.test("no scopes means nothing is readable", () => {
  const scoped = createScopedQuery(ctxWith([]));
  for (const table of Object.keys(QUERY_POLICY) as TableName[]) {
    assertThrows(() => scoped(table, ["id"]), QueryDenied);
  }
});

// ---------- forced tenant scoping + row cap ----------

Deno.test("always forces the caller's tenant and caps rows", () => {
  const { supabase, calls } = fakeClient();
  const ctx: Ctx = { supabase, userId: "u", tenantId: "tenant-1", scopes: new Set<Scope>(bothScopes) };
  createScopedQuery(ctx)("members", ["id"], { limit: 999999 });

  const eq = calls.find((c) => c.fn === "eq");
  assertEquals(eq?.args, ["tenant_id", "tenant-1"]);
  const limit = calls.find((c) => c.fn === "limit");
  assertEquals(limit?.args, [5000]); // hard cap, caller value ignored
});

Deno.test("tenant filter cannot be overridden by tool arguments", () => {
  const { supabase, calls } = fakeClient();
  const ctx: Ctx = { supabase, userId: "u", tenantId: "tenant-1", scopes: new Set<Scope>(bothScopes) };
  const q = createScopedQuery(ctx)("members", ["id"]);
  // A hallucinated/injected attempt to re-scope to another tenant must be denied.
  assertThrows(() => q.assertFilter("tenant_id"), QueryDenied);
  const eqs = calls.filter((c) => c.fn === "eq");
  assertEquals(eqs.length, 1);
  assertEquals(eqs[0].args, ["tenant_id", "tenant-1"]);
});

Deno.test("non tenant-scoped tables are never given a tenant filter", () => {
  const { supabase, calls } = fakeClient();
  const ctx: Ctx = { supabase, userId: "u", tenantId: "tenant-1", scopes: new Set<Scope>(["members"]) };
  createScopedQuery(ctx)("ministry_members", ["ministry_id"]);
  assertEquals(calls.filter((c) => c.fn === "eq").length, 0);
});

// ---------- input sanitisation ----------

Deno.test("safeDate rejects malformed / injected dates", () => {
  const bad = [
    "2024-1-1",
    "2024/01/01",
    "yesterday",
    "2024-01-01' OR '1'='1",
    "2024-01-01T00:00:00Z",
    "",
    "0000-13-45x",
  ];
  for (const v of bad) assertThrows(() => safeDate(v, "from"), QueryDenied);
  assertEquals(safeDate("2024-01-31", "from"), "2024-01-31");
});

Deno.test("safeIds rejects non-uuid values, injection strings and oversized lists", () => {
  const uuid = "11111111-2222-3333-4444-555555555555";
  assertEquals(safeIds([uuid], "ids"), [uuid]);
  assertThrows(() => safeIds(["not-a-uuid"], "ids"), QueryDenied);
  assertThrows(() => safeIds([`${uuid}') or true--`], "ids"), QueryDenied);
  assertThrows(() => safeIds([123], "ids"), QueryDenied);
  assertThrows(() => safeIds([null], "ids"), QueryDenied);
  assertThrows(() => safeIds(new Array(501).fill(uuid), "ids"), QueryDenied);
});

// ---------- denials never escape as exceptions ----------

Deno.test("guarded converts denials into safe tool results", async () => {
  const run = guarded("test_tool", async () => {
    const scoped = createScopedQuery(ctxWith(["members"]));
    scoped("donations", ["amount"]);
    return { ok: true };
  });
  const res = (await run({})) as { error?: string };
  assert(res.error?.startsWith("Request denied:"), `unexpected result: ${JSON.stringify(res)}`);
  assert(!res.error?.includes("tenant-1"));
});

Deno.test("guarded still surfaces ordinary errors without denial wording", async () => {
  const run = guarded("test_tool", async () => {
    throw new Error("boom");
  });
  assertEquals(await run({}), { error: "boom" });
});
