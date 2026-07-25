// ---------- server-side query validation ----------
// Extracted so it can be unit-tested in isolation (see validation_test.ts).
import { type SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Allow-list of every table/column/filter the assistant may ever touch.
 * Anything not described here is rejected before a query is built, so a
 * prompt-injected or hallucinated tool argument can never widen the scope.
 */
export const QUERY_POLICY = {
  members: {
    tenantScoped: true,
    columns: ["id", "first_name", "last_name", "phone", "email", "status", "date_of_birth"],
    filters: ["status", "date_of_birth"],
    requires: "members",
  },
  attendance_records: {
    tenantScoped: true,
    columns: ["member_id", "event_date"],
    filters: ["event_date"],
    requires: "members",
  },
  visitors: {
    tenantScoped: true,
    columns: [
      "first_name",
      "last_name",
      "phone",
      "email",
      "visit_date",
      "how_heard",
      "follow_up_status",
      "converted_to_member_id",
    ],
    filters: ["visit_date"],
    requires: "members",
  },
  ministries: {
    tenantScoped: true,
    columns: ["id", "name", "status"],
    filters: [],
    requires: "members",
  },
  ministry_members: {
    // No tenant_id column: always constrained to ministry ids already
    // resolved through the tenant-scoped `ministries` query.
    tenantScoped: false,
    columns: ["ministry_id", "joined_date"],
    filters: ["ministry_id"],
    requires: "members",
  },
  member_engagement_scores: {
    tenantScoped: true,
    columns: [
      "total_score",
      "attendance_score",
      "giving_score",
      "ministry_score",
      "trend",
      "members(first_name, last_name)",
    ],
    filters: [],
    requires: "members",
  },
  member_risk_predictions: {
    tenantScoped: true,
    columns: [
      "risk_probability",
      "risk_category",
      "days_since_last_attendance",
      "contributing_factors",
      "members(first_name, last_name)",
    ],
    filters: [],
    requires: "members",
  },
  donations: {
    tenantScoped: true,
    columns: ["member_id", "donation_date", "amount", "donation_type", "payment_method"],
    filters: ["donation_date"],
    requires: "finance",
  },
  expenses: {
    tenantScoped: true,
    columns: ["amount", "status", "expense_date", "category_id", "description"],
    filters: ["expense_date"],
    requires: "finance",
  },
  expense_categories: {
    tenantScoped: true,
    columns: ["id", "name"],
    filters: ["id"],
    requires: "finance",
  },
} as const;

export type TableName = keyof typeof QUERY_POLICY;
export type Scope = "members" | "finance";

/** Machine-readable identifier of the policy rule that blocked a request. */
export type DenialRule =
  | "table_not_allowed"
  | "scope_denied"
  | "column_not_allowed"
  | "filter_not_allowed"
  | "invalid_date"
  | "invalid_identifier"
  | "too_many_values";

export type DenialDetails = {
  rule: DenialRule;
  table?: string;
  column?: string;
  requiredScope?: string;
};

export class QueryDenied extends Error {
  readonly details: DenialDetails;
  constructor(message: string, details: DenialDetails) {
    super(message);
    this.details = details;
  }
}

/** Structured record emitted for every denied tool call. */
export type DenialEvent = DenialDetails & {
  toolName: string;
  message: string;
  args: unknown;
};

let denialLogger: ((event: DenialEvent) => void | Promise<void>) | null = null;

/** Register a sink (e.g. a DB insert) for denial events. */
export function setDenialLogger(fn: ((event: DenialEvent) => void | Promise<void>) | null) {
  denialLogger = fn;
}

export type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  tenantId: string;
  scopes: Set<Scope>;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a caller-supplied date. Rejects anything that is not a plain ISO date. */
export function safeDate(value: string, label: string): string {
  if (!ISO_DATE.test(value)) {
    throw new QueryDenied(`${label} must be a plain YYYY-MM-DD date.`, {
      rule: "invalid_date",
      column: label,
    });
  }
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new QueryDenied(`${label} is not a valid date.`, { rule: "invalid_date", column: label });
  }
  return value;
}

/** Validate an id list used in an `in()` filter (uuids only, bounded length). */
export function safeIds(ids: unknown[], label: string): string[] {
  if (ids.length > 500) {
    throw new QueryDenied(`${label} contains too many values.`, {
      rule: "too_many_values",
      column: label,
    });
  }
  return ids.map((v) => {
    if (typeof v !== "string" || !/^[0-9a-fA-F-]{36}$/.test(v)) {
      throw new QueryDenied(`${label} contains an invalid identifier.`, {
        rule: "invalid_identifier",
        column: label,
      });
    }
    return v;
  });
}


/**
 * Builds a query that is guaranteed to be:
 *  - on an allow-listed table,
 *  - limited to allow-listed columns,
 *  - forced to the caller's tenant,
 *  - allowed only for the caller's role scope,
 *  - hard-capped in row count.
 * RLS remains the outer boundary; this is the inner, explicit one.
 */
export function createScopedQuery(ctx: Ctx) {
  return function scoped(table: TableName, columns: string[], opts?: { limit?: number }) {
    const policy = QUERY_POLICY[table];
    if (!policy) {
      throw new QueryDenied(`Table "${table}" is not available to the assistant.`, {
        rule: "table_not_allowed",
        table,
      });
    }
    if (!ctx.scopes.has(policy.requires as Scope)) {
      throw new QueryDenied(`You are not allowed to read ${table}.`, {
        rule: "scope_denied",
        table,
        requiredScope: policy.requires,
      });
    }
    for (const col of columns) {
      if (!(policy.columns as readonly string[]).includes(col)) {
        throw new QueryDenied(`Column "${col}" is not readable on ${table}.`, {
          rule: "column_not_allowed",
          table,
          column: col,
        });
      }
    }
    let q = ctx.supabase.from(table).select(columns.join(", "));
    if (policy.tenantScoped) q = q.eq("tenant_id", ctx.tenantId);
    q = q.limit(Math.min(opts?.limit ?? 1000, 5000));
    return {
      query: q,
      /** Only filters declared in the policy for this table may be applied. */
      assertFilter(column: string) {
        if (!(policy.filters as readonly string[]).includes(column)) {
          throw new QueryDenied(`Filtering ${table} by "${column}" is not permitted.`, {
            rule: "filter_not_allowed",
            table,
            column,
          });
        }
        return column;
      },
    };
  };
}

/** Wraps a tool execute so denials/errors are returned as data, never thrown into the stream. */
export function guarded<T>(name: string, fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      return await fn(args);
    } catch (e) {
      if (e instanceof QueryDenied) {
        const event: DenialEvent = { ...e.details, toolName: name, message: e.message, args };
        console.warn(`[ai-pastor-assistant] denied ${JSON.stringify(event)}`);
        try {
          await denialLogger?.(event);
        } catch (logErr) {
          console.error("[ai-pastor-assistant] denial log failed", logErr);
        }
        // Returned to the model AND surfaced to the user in the chat UI so a
        // denial is explained instead of silently logged for admins only.
        return {
          error: `Request denied: ${e.message}`,
          denied: true,
          rule: e.details.rule,
          table: e.details.table ?? null,
          column: e.details.column ?? null,
          requiredScope: e.details.requiredScope ?? null,
          tool: name,
        };
      }
      console.error(`[ai-pastor-assistant] ${name} failed`, e);
      return { error: e instanceof Error ? e.message : String(e) };
    }

  };
}
