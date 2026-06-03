---
title: Commands
description: The /qa-catalog slash commands.
---

| Command | What it does |
|---|---|
| `/qa-catalog:init` | First-time bootstrap. Detects the framework, discovers routes, analyzes every page in a browser, authors tasks, writes the catalog, and installs the pre-commit guard. Ends with a ✓ checklist receipt. |
| `/qa-catalog:status` | Read-only health + inventory snapshot: browser-agent install state, catalog framework/route/task counts, configured issue trackers, drift vs. source, and the last run's pass/fail/blocked totals. |
| `/qa-catalog:sync` | Incremental reconciler — only re-analyses routes whose source fingerprint changed since the last run. |
| `/qa-catalog:scan` | Force a full rescan (backs up `tasks/` first). |
| `/qa-catalog:run <id>` | Execute a single task end-to-end → `result.md` + screenshots. |
| `/qa-catalog:run-all [filter]` | Execute many tasks in parallel, with verification + retry. |

## `/qa-catalog:run-all` filters

```text
/qa-catalog:run-all              # every task
/qa-catalog:run-all T01,T03,T07  # subset by task id
/qa-catalog:run-all /customers   # subset by route prefix
/qa-catalog:run-all failed       # only tasks whose last result was FAIL/BLOCKED
/qa-catalog:run-all changed      # only tasks whose route source is dirty
```

Each invocation writes a self-contained, auto-refreshing dashboard at `QA-tests/results/runs/<runId>/report.html`. Open it in a browser to watch the queue drain live.

## Why the supervisor lives in the skill layer

Subagents cannot spawn other subagents (per Claude docs). The `run-all` parallel orchestrator therefore lives in the **skill** (main session), which fans work out to N `qa-test-runner` subagents in batches, awaits each batch, verifies each `result.md` against the schema, retries failed verifications once, and then writes the cross-task `summary.md`.
