---
title: Quickstart
description: The seven QA My App slash commands and the run dashboard.
---

Once installed, drive everything from seven slash commands:

```text
/qa-my-app:init                 # First-time bootstrap; builds QA-tests/
/qa-my-app:status               # Read-only health + inventory snapshot
/qa-my-app:sync                 # After code changes, reconcile catalog
/qa-my-app:scan                 # Force full rescan (backs up tasks first)
/qa-my-app:run T03              # Execute one task end-to-end
/qa-my-app:run-all              # Execute every task — parallel runners
/qa-my-app:run-all T01,T03,T07  # Subset by task id
/qa-my-app:run-all /customers   # Subset by route prefix
/qa-my-app:run-all failed       # Re-run only tasks whose last result was FAIL/BLOCKED
/qa-my-app:run-all changed      # Re-run only tasks whose route source is dirty
/qa-my-app:verify               # Test just what changed (conversation + uncommitted diff)
/qa-my-app:verify PROJ-123      # Verify against a ticket's acceptance criteria
/qa-my-app:verify --branch      # Verify the whole PR (everything different from main)
```

## You don't always have to type them

`status` and `verify` are **model-invocable** — ask in plain language and Claude reaches for them:

```text
"is QA set up in this repo?"      → /qa-my-app:status
"verify what I just changed"      → /qa-my-app:verify
"does my change actually work?"   → /qa-my-app:verify
"check PROJ-123 is done"          → /qa-my-app:verify PROJ-123
```

The other five stay strictly manual. `init`, `sync`, and `scan` rewrite your catalog, and `run` /
`run-all` spawn real browser runs — Claude will never start any of those on its own.

## The live run dashboard

Every `/qa-my-app:run`, `/qa-my-app:run-all`, or `/qa-my-app:verify` invocation writes a self-contained dashboard at `QA-tests/results/runs/<runId>/report.html`. Open it in a browser while the run is in flight — the page meta-refreshes every 3 seconds and shows the queue draining live (pending → dispatched → complete, with per-task verdicts, defects, and links to `result.md`). Once the run finishes, auto-refresh disables itself and the same file becomes the canonical browse view for that run.

No server, no install, no dependencies — double-click to open.

## Typical first session

```text
/qa-my-app:init        # discover routes, analyze pages, author tasks (5–20 min first time)
/qa-my-app:run-all     # execute the whole catalog in parallel
```

Subsequent runs are incremental — `/qa-my-app:sync` only re-analyses routes whose source fingerprint changed. See [How it works](/qa-my-app/guides/how-it-works/) for why this stays deterministic and PR-reviewable.
