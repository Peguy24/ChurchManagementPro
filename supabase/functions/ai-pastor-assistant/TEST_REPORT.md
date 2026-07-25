# AI Pastor Assistant — Test Report

Generated: 2026-07-25T21:25:58.837Z

**Result: PASS** — 24 passed, 0 failed, 1 skipped (25 total)

**Rule coverage: 7/7** — 147 policy decisions exercised (49 allowed, 98 denied).

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

## Policy rules exercised

| Rule | Times triggered | Covered |
| --- | ---: | --- |
| `table_not_allowed` | 12 | yes |
| `scope_denied` | 19 | yes |
| `column_not_allowed` | 7 | yes |
| `filter_not_allowed` | 47 | yes |
| `invalid_date` | 7 | yes |
| `invalid_identifier` | 5 | yes |
| `too_many_values` | 1 | yes |

## Tables exercised

| Table | Allowed queries | Denials |
| --- | ---: | ---: |
| `members` | 10 | 14 |
| `attendance_records` | 4 | 7 |
| `visitors` | 3 | 7 |
| `ministries` | 4 | 6 |
| `ministry_members` | 5 | 2 |
| `member_engagement_scores` | 4 | 6 |
| `member_risk_predictions` | 3 | 6 |
| `donations` | 7 | 11 |
| `expenses` | 4 | 8 |
| `expense_categories` | 5 | 6 |
