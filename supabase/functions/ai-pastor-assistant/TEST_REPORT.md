# AI Pastor Assistant — Test Report

Generated: 2026-07-25T21:25:02.596Z

**Result: FAIL** — 24 passed, 1 failed, 1 skipped (26 total)

## Tests

### cross_tenant_test.ts

| Result | Test |
| --- | --- |
| PASS | system prompt pins the assistant to the caller's church |
| PASS | system prompt never leaks tenant ids or other tenant names |
| PASS | prompt refusal rule is emitted for every supported language |
| PASS | every tenant-scoped table is forced to the caller's tenant |
| PASS | a tool argument naming another church cannot re-scope the query |
| PASS | tenant/church lookup tables are not reachable by the assistant |
| PASS | another tenant's ids cannot be smuggled through an in() filter column |
| PASS | denial results returned to the model never disclose tenant identifiers |
| PASS | a crash inside a tool never leaks the tenant id to the model |
| SKIP | live model refuses a question about another church |

### validation_test.ts

| Result | Test |
| --- | --- |
| PASS | denies tables outside the allow-list |
| PASS | denies columns that are not readable on an allow-listed table |
| PASS | allows only the exact policy columns |
| PASS | denies filters that are not declared for the table |
| PASS | permits declared filters |
| PASS | members-only role cannot read finance tables |
| PASS | finance-only role cannot read member tables |
| PASS | no scopes means nothing is readable |
| PASS | always forces the caller's tenant and caps rows |
| PASS | tenant filter cannot be overridden by tool arguments |
| PASS | non tenant-scoped tables are never given a tenant filter |
| PASS | safeDate rejects malformed / injected dates |
| PASS | safeIds rejects non-uuid values, injection strings and oversized lists |
| PASS | guarded converts denials into safe tool results |
| PASS | guarded still surfaces ordinary errors without denial wording |

### zz_coverage_report_test.ts

| Result | Test |
| --- | --- |
| FAIL | policy rule coverage report |

## Policy rules exercised

0/7 rules covered — 0 policy decisions (0 allowed, 0 denied).

| Rule | Times triggered | Covered |
| --- | ---: | --- |
| `table_not_allowed` | 0 | NO |
| `scope_denied` | 0 | NO |
| `column_not_allowed` | 0 | NO |
| `filter_not_allowed` | 0 | NO |
| `invalid_date` | 0 | NO |
| `invalid_identifier` | 0 | NO |
| `too_many_values` | 0 | NO |

## Tables exercised

| Table | Allowed queries | Denials |
| --- | ---: | ---: |
| `members` | 0 | 0 |
| `attendance_records` | 0 | 0 |
| `visitors` | 0 | 0 |
| `ministries` | 0 | 0 |
| `ministry_members` | 0 | 0 |
| `member_engagement_scores` | 0 | 0 |
| `member_risk_predictions` | 0 | 0 |
| `donations` | 0 | 0 |
| `expenses` | 0 | 0 |
| `expense_categories` | 0 | 0 |
