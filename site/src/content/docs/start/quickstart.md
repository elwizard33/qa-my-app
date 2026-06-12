---
title: Quickstart
description: The seven QA My App slash commands and the run dashboard.
---

Once installed, drive everything from seven slash commands:

```text
/qa-catalog:init                 # First-time bootstrap; builds QA-tests/
/qa-catalog:status               # Read-only health + inventory snapshot
/qa-catalog:sync                 # After code changes, reconcile catalog
/qa-catalog:scan                 # Force full rescan (backs up tasks first)
/qa-catalog:run T03              # Execute one task end-to-end
/qa-catalog:run-all              # Execute every task — parallel runners
/qa-catalog:run-all T01,T03,T07  # Subset by task id
/qa-catalog:run-all /customers   # Subset by route prefix
/qa-catalog:run-all failed       # Re-run only tasks whose last result was FAIL/BLOCKED
/qa-catalog:run-all changed      # Re-run only tasks whose route source is dirty
/qa-catalog:verify               # Test just what changed (conversation + uncommitted diff)
/qa-catalog:verify PROJ-123      # Verify against a ticket's acceptance criteria
/qa-catalog:verify --branch      # Verify the whole PR (everything different from main)
```

## The live run dashboard

Every `/qa-catalog:run`, `/qa-catalog:run-all`, or `/qa-catalog:verify` invocation writes a self-contained dashboard at `QA-tests/results/runs/<runId>/report.html`. Open it in a browser while the run is in flight — the page meta-refreshes every 3 seconds and shows the queue draining live (pending → dispatched → complete, with per-task verdicts, defects, and links to `result.md`). Once the run finishes, auto-refresh disables itself and the same file becomes the canonical browse view for that run.

No server, no install, no dependencies — double-click to open.

## Typical first session

```text
/qa-catalog:init        # discover routes, analyze pages, author tasks (5–20 min first time)
/qa-catalog:run-all     # execute the whole catalog in parallel
```

Subsequent runs are incremental — `/qa-catalog:sync` only re-analyses routes whose source fingerprint changed. See [How it works](/qa-my-app/guides/how-it-works/) for why this stays deterministic and PR-reviewable.
