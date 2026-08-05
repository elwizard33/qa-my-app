---
title: Commands
description: The /qa-my-app slash commands.
---

| Command | What it does |
|---|---|
| `/qa-my-app:init` | First-time bootstrap. Detects the framework, discovers routes, analyzes every page in a browser, authors tasks, writes the catalog, and installs the pre-commit guard. Ends with a ✓ checklist receipt. |
| `/qa-my-app:status` | Read-only health + inventory snapshot: browser-agent install state, catalog framework/route/task counts, configured issue trackers, drift vs. source, and the last run's pass/fail/blocked totals. |
| `/qa-my-app:sync` | Incremental reconciler — only re-analyses routes whose source fingerprint changed since the last run. |
| `/qa-my-app:scan` | Force a full rescan (backs up `tasks/` first). |
| `/qa-my-app:run <id>` | Execute a single task end-to-end → `result.md` + screenshots. |
| `/qa-my-app:run-all [filter]` | Execute many tasks in parallel, with verification + retry. |
| `/qa-my-app:verify [scope]` | Test only what changed (or what a ticket asks for). Re-authors the affected tasks and runs them, reporting pass/fail **per acceptance criterion**. The fast inner-loop counterpart to `run-all`. |

## Who can invoke what

`status` and `verify` are **model-invocable**: you can type them, or just ask in plain language —
"is QA set up?", "verify what I changed", "does my change work?" — and Claude will reach for them.

The other five rewrite the catalog or spawn long browser runs, so they set
`disable-model-invocation: true` and only ever run when **you** type them. Claude will never decide
on its own to re-baseline your catalog or kick off a full regression.

## `/qa-my-app:run-all` filters

```text
/qa-my-app:run-all              # every task
/qa-my-app:run-all T01,T03,T07  # subset by task id
/qa-my-app:run-all /customers   # subset by route prefix
/qa-my-app:run-all failed       # only tasks whose last result was FAIL/BLOCKED
/qa-my-app:run-all changed      # only tasks whose route source is dirty
```

## `/qa-my-app:verify` scope

```text
/qa-my-app:verify               # default: this conversation + the uncommitted git diff
/qa-my-app:verify PROJ-123      # a connected tracker's ticket — pulls its acceptance criteria
/qa-my-app:verify --branch      # everything different from main (verify the whole PR)
/qa-my-app:verify --branch dev  # everything different from <base>
/qa-my-app:verify --staged      # only staged changes
/qa-my-app:verify /customers    # one route
/qa-my-app:verify app/foo.tsx   # the route(s) a file backs
```

`verify` maps changed source files onto the catalog (`scripts/change-scope.mjs`), re-authors only the affected tasks so they reflect the current page, then runs them. When a ticket is given and a Jira / GitHub / Azure DevOps MCP is connected, its acceptance criteria become checked assertions and the report says how many were verified.

Each `run`, `run-all`, and `verify` invocation writes a self-contained, auto-refreshing dashboard at `QA-tests/results/runs/<runId>/report.html`. Open it in a browser to watch the queue drain live.

## Why the supervisor lives in the skill layer

Subagents cannot spawn other subagents (per Claude docs). The `run-all` parallel orchestrator therefore lives in the **skill** (main session), which fans work out to N `qa-test-runner` subagents in batches, awaits each batch, verifies each `result.md` against the schema, retries failed verifications once, and then writes the cross-task `summary.md`.
