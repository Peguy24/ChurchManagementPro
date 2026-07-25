// Test runner + report generator for the AI Pastor Assistant safety suite.
//
//   deno run -A supabase/functions/ai-pastor-assistant/run_tests.ts
//
// Runs the Deno test suite, then writes TEST_REPORT.md with pass/fail results
// per test and which policy rules / tables were exercised during the run.

const DIR = new URL("./", import.meta.url);
const REPORT_FILE = new URL("TEST_REPORT.md", DIR);
const COVERAGE_FILE = new URL("./.test-artifacts/rule-coverage.json", DIR);

type TestResult = { name: string; classname: string; status: "pass" | "fail" | "skip" };

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

function decode(s: string) {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function icon(status: TestResult["status"]) {
  return status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
}

const cmd = new Deno.Command("deno", {
  args: ["test", "-A", "--reporter=junit", "--quiet", DIR.pathname],
  stdout: "piped",
  stderr: "piped",
});
const out = await cmd.output();
const xml = new TextDecoder().decode(out.stdout);
const stderr = new TextDecoder().decode(out.stderr);

const results = parseJUnit(xml);
const passed = results.filter((r) => r.status === "pass").length;
const failed = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;

let coverage: any = null;
try {
  coverage = JSON.parse(await Deno.readTextFile(COVERAGE_FILE));
} catch {
  // coverage test did not run (e.g. filtered run) — report without it
}

const byFile = new Map<string, TestResult[]>();
for (const r of results) {
  const file = r.classname.split("/").pop() || r.classname;
  byFile.set(file, [...(byFile.get(file) ?? []), r]);
}

const lines: string[] = [];
lines.push("# AI Pastor Assistant — Test Report", "");
lines.push(`Generated: ${new Date().toISOString()}`, "");
lines.push(`**Result: ${failed === 0 ? "PASS" : "FAIL"}** — ${passed} passed, ${failed} failed, ${skipped} skipped (${results.length} total)`, "");

lines.push("## Tests", "");
for (const [file, list] of [...byFile].sort()) {
  lines.push(`### ${file}`, "");
  lines.push("| Result | Test |", "| --- | --- |");
  for (const r of list) lines.push(`| ${icon(r.status)} | ${r.name} |`);
  lines.push("");
}

if (coverage) {
  const t = coverage.totals;
  lines.push("## Policy rules exercised", "");
  lines.push(`${t.rulesCovered}/${t.rulesTotal} rules covered — ${t.decisions} policy decisions (${t.allowed} allowed, ${t.denied} denied).`, "");
  lines.push("| Rule | Times triggered | Covered |", "| --- | ---: | --- |");
  for (const r of coverage.rules) {
    lines.push(`| \`${r.rule}\` | ${r.hits} | ${r.hits > 0 ? "yes" : "NO"} |`);
  }
  lines.push("", "## Tables exercised", "");
  lines.push("| Table | Allowed queries | Denials |", "| --- | ---: | ---: |");
  for (const tb of coverage.tables) {
    lines.push(`| \`${tb.table}\` | ${tb.allowed} | ${tb.denied} |`);
  }
  lines.push("");
} else {
  lines.push("## Policy rules exercised", "", "_No coverage ledger produced by this run._", "");
}

const report = lines.join("\n");
await Deno.writeTextFile(REPORT_FILE, report);

console.log(report);
if (failed > 0) console.error(stderr);
Deno.exit(failed > 0 || out.code !== 0 ? 1 : 0);
