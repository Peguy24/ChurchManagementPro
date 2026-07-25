// Test runner + report generator for the AI Pastor Assistant safety suite.
//
//   deno run -A supabase/functions/ai-pastor-assistant/run_tests.ts
//
// Runs the Deno test suite, then writes TEST_REPORT.md with pass/fail results
// per test and which policy rules / tables were exercised during the run.
import { QUERY_POLICY, type CoverageEvent, type DenialRule } from "./validation.ts";

const DIR = new URL("./", import.meta.url);
const REPORT_FILE = new URL("TEST_REPORT.md", DIR);
const ARTIFACT_DIR = new URL("./.test-artifacts/", DIR);
const LEDGER_FILE = new URL("coverage.jsonl", ARTIFACT_DIR);
const COVERAGE_JSON = new URL("rule-coverage.json", ARTIFACT_DIR);

const ALL_RULES: DenialRule[] = [
  "table_not_allowed",
  "scope_denied",
  "column_not_allowed",
  "filter_not_allowed",
  "invalid_date",
  "invalid_identifier",
  "too_many_values",
];

type TestResult = { name: string; classname: string; status: "pass" | "fail" | "skip" };

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function parseJUnit(xml: string): TestResult[] {
  const results: TestResult[] = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  for (const m of xml.matchAll(re)) {
    const attrs = m[1];
    const body = m[3] ?? "";
    const name = /name="([^"]*)"/.exec(attrs)?.[1] ?? "(unnamed)";
    const classname = /classname="([^"]*)"/.exec(attrs)?.[1] ?? "";
    const status: TestResult["status"] = /<failure|<error/.test(body)
      ? "fail"
      : /<skipped/.test(body)
      ? "skip"
      : "pass";
    results.push({ name: decode(name), classname: decode(classname), status });
  }
  return results;
}

// ---------- run the suite with the coverage ledger enabled ----------

await Deno.mkdir(ARTIFACT_DIR, { recursive: true });
try {
  await Deno.remove(LEDGER_FILE);
} catch { /* first run */ }

const out = await new Deno.Command("deno", {
  args: ["test", "-A", "--reporter=junit", "--quiet", DIR.pathname],
  env: { AI_TEST_COVERAGE_FILE: LEDGER_FILE.pathname },
  stdout: "piped",
  stderr: "piped",
}).output();

const xml = new TextDecoder().decode(out.stdout);
const stderr = new TextDecoder().decode(out.stderr);

const results = parseJUnit(xml);
const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;

// ---------- aggregate the policy-decision ledger ----------

let events: CoverageEvent[] = [];
try {
  events = (await Deno.readTextFile(LEDGER_FILE))
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as CoverageEvent);
} catch { /* no decisions recorded */ }

const denied = events.filter((e) => e.kind === "denied");
const allowed = events.filter((e) => e.kind === "allowed");
const rules = ALL_RULES.map((rule) => ({ rule, hits: denied.filter((e) => e.rule === rule).length }));
const tables = Object.keys(QUERY_POLICY).map((table) => ({
  table,
  allowed: allowed.filter((e) => e.table === table).length,
  denied: denied.filter((e) => e.table === table).length,
}));
const uncoveredRules = rules.filter((r) => r.hits === 0).map((r) => r.rule);
const uncoveredTables = tables.filter((t) => t.allowed + t.denied === 0).map((t) => t.table);

await Deno.writeTextFile(
  COVERAGE_JSON,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totals: {
        tests: results.length,
        passed,
        failed,
        skipped,
        decisions: events.length,
        allowed: allowed.length,
        denied: denied.length,
        rulesCovered: rules.length - uncoveredRules.length,
        rulesTotal: rules.length,
      },
      rules,
      tables,
    },
    null,
    2,
  ),
);

// ---------- markdown report ----------

const gaps = failed > 0 || uncoveredRules.length > 0;
const byFile = new Map<string, TestResult[]>();
for (const r of results) {
  const file = r.classname.split("/").pop() || r.classname;
  byFile.set(file, [...(byFile.get(file) ?? []), r]);
}

const lines: string[] = [];
lines.push("# AI Pastor Assistant — Test Report", "");
lines.push(`Generated: ${new Date().toISOString()}`, "");
lines.push(
  `**Result: ${gaps ? "FAIL" : "PASS"}** — ${passed} passed, ${failed} failed, ${skipped} skipped (${results.length} total)`,
  "",
);
lines.push(
  `**Rule coverage: ${rules.length - uncoveredRules.length}/${rules.length}** — ${events.length} policy decisions exercised (${allowed.length} allowed, ${denied.length} denied).`,
  "",
);

lines.push("## Tests", "");
for (const [file, list] of [...byFile].sort()) {
  lines.push(`### ${file}`, "", "| Result | Test |", "| --- | --- |");
  for (const r of list) {
    lines.push(`| ${r.status === "pass" ? "PASS" : r.status === "fail" ? "FAIL" : "SKIP"} | ${r.name} |`);
  }
  lines.push("");
}

lines.push("## Policy rules exercised", "", "| Rule | Times triggered | Covered |", "| --- | ---: | --- |");
for (const r of rules) lines.push(`| \`${r.rule}\` | ${r.hits} | ${r.hits > 0 ? "yes" : "NO"} |`);
lines.push("");

lines.push("## Tables exercised", "", "| Table | Allowed queries | Denials |", "| --- | ---: | ---: |");
for (const t of tables) lines.push(`| \`${t.table}\` | ${t.allowed} | ${t.denied} |`);
lines.push("");

if (uncoveredRules.length) lines.push(`> Uncovered rules: ${uncoveredRules.join(", ")}`, "");
if (uncoveredTables.length) lines.push(`> Tables never queried by a test: ${uncoveredTables.join(", ")}`, "");

const report = lines.join("\n");
await Deno.writeTextFile(REPORT_FILE, report);
console.log(report);
if (failed > 0) console.error(stderr);
Deno.exit(gaps || out.code !== 0 ? 1 : 0);
