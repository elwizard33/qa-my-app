---
title: Quickstart
description: The five QA My App slash commands and the run dashboard.
---

Once installed, drive everything from five slash commands:

```text
/qa-catalog:init                 # First-time bootstrap; builds QA-tests/
/qa-catalog:sync                 # After code changes, reconcile catalog
/qa-catalog:scan                 # Force full rescan (backs up tasks first)
/qa-catalog:run T03              # Execute one task end-to-end
/qa-catalog:run-all              # Execute every task — parallel runners
/qa-catalog:run-all T01,T03,T07  # Subset by task id
/qa-catalog:run-all /customers   # Subset by route prefix
/qa-catalog:run-all failed       # Re-run only tasks whose last result was FAIL/BLOCKED
/qa-catalog:run-all changed      # Re-run only tasks whose route source is dirty
```

## The live run dashboard

Every `/qa-catalog:run` or `/qa-catalog:run-all` invocation writes a self-contained dashboard at `QA-tests/results/runs/<runId>/report.html`. Open it in a browser while the run is in flight — the page meta-refreshes every 3 seconds and shows the queue draining live (pending → dispatched → complete, with per-task verdicts, defects, and links to `result.md`). Once the run finishes, auto-refresh disables itself and the same file becomes the canonical browse view for that run.

No server, no install, no dependencies — double-click to open.

## Typical first session

```text
/qa-catalog:init        # discover routes, analyze pages, author tasks (5–20 min first time)
/qa-catalog:run-all     # execute the whole catalog in parallel
```

Subsequent runs are incremental — `/qa-catalog:sync` only re-analyses routes whose source fingerprint changed. See [How it works](/qa-my-app/guides/how-it-works/) for why this stays deterministic and PR-reviewable.
