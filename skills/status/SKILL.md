---
description: Print a one-shot health + inventory snapshot of the QA catalog in this project — browser-agent install status, catalog framework/route/task counts, configured issue-tracker integrations, drift vs. source, and the most recent run's pass/fail/blocked totals. Read-only; never modifies the catalog. Use to verify an install or get your bearings before a run.
when_to_use: |
  Use to confirm the plugin is wired up correctly, to see how many routes and tasks exist, to check whether the catalog has drifted from source, or to recall the last run's results without opening files. Trigger phrases include "qa status", "is qa set up", "catalog status", "show qa health", "how many tests", and "did the catalog drift".
disable-model-invocation: true
allowed-tools: Read, Bash(node *), Bash(test *)
---

# /qa-catalog:status — Catalog health & inventory

## Snapshot
- Inventory: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/status.mjs"`
- Drift vs. source: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/catalog-diff.mjs" --notify`

## Instructions

This skill is **read-only** — it never writes to `QA-tests/`. Present the two snapshots above to the user as a concise status report, then suggest the single most relevant next command:

- If the browser agents are missing **or** `QA-tests/catalog.json` is absent → recommend `/qa-catalog:init`.
- If drift was reported (`⚠ N route(s) drifted`) → recommend `/qa-catalog:sync`.
- If the catalog is present and up to date but there's no last run → recommend `/qa-catalog:run-all` (or `/qa-catalog:run <task>` for a single task).
- If everything is current and a recent run exists → report the pass/fail/blocked totals and note the catalog is healthy; no action needed.

Do not spawn subagents and do not run a browser. Keep the report to what the two snapshot commands returned.
