// Runs last (alphabetically) in the suite: dumps the in-process ledger of every
// policy decision exercised by the other test files so the report generator can
// show WHICH rules were actually covered by this run.
import { COVERAGE, QUERY_POLICY, type DenialRule } from "./validation.ts";

const ALL_RULES: DenialRule[] = [
  "table_not_allowed",
  "scope_denied",
  "column_not_allowed",
  "filter_not_allowed",
  "invalid_date",
  "invalid_identifier",
  "too_many_values",
];

export const ARTIFACT_DIR = new URL("./.test-artifacts/", import.meta.url);
export const COVERAGE_FILE = new URL("rule-coverage.json", ARTIFACT_DIR);

Deno.test("policy rule coverage report", async () => {
  const denied = COVERAGE.filter((e) => e.kind === "denied");
  const allowed = COVERAGE.filter((e) => e.kind === "allowed");

  const rules = ALL_RULES.map((rule) => ({
    rule,
    hits: denied.filter((e) => e.rule === rule).length,
  }));

  const tables = Object.keys(QUERY_POLICY).map((table) => ({
    table,
    allowed: allowed.filter((e) => e.table === table).length,
    denied: denied.filter((e) => e.table === table).length,
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    totals: {
      decisions: COVERAGE.length,
      allowed: allowed.length,
      denied: denied.length,
      rulesCovered: rules.filter((r) => r.hits > 0).length,
      rulesTotal: ALL_RULES.length,
    },
    rules,
    tables,
  };

  await Deno.mkdir(ARTIFACT_DIR, { recursive: true });
  await Deno.writeTextFile(COVERAGE_FILE, JSON.stringify(payload, null, 2));

  // The report is also an assertion: every policy rule must be exercised.
  const uncovered = rules.filter((r) => r.hits === 0).map((r) => r.rule);
  if (uncovered.length > 0) {
    throw new Error(`policy rules never exercised by the suite: ${uncovered.join(", ")}`);
  }
});
