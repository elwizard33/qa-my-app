---
description: Force a full re-scan of every route and rewrite every task, regardless of fingerprints. Use when the catalog drifted too far or when you change the test-author template or task depth. Destructive — overwrites QA-tests/tasks/ after backing them up.
when_to_use: |
  Use when the catalog has drifted too far for an incremental sync, when the test-author template has been changed, or after adjusting task depth settings. Trigger phrases include "force rescan", "regenerate all tests", "full rescan", "redo all tasks", "rescan everything", and "regenerate catalog".
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *), Bash(git *), Bash(mkdir *), Agent(qa-catalog:route-discoverer), Agent(qa-page-analyzer), Agent(qa-catalog:test-author)
---

# /qa-catalog:scan — Full rescan

## Project context
- Framework: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-framework.mjs"`
- Existing catalog: !`test -f QA-tests/catalog.json && echo YES || echo NO`

## Runtime settings
Identical to `/qa-catalog:init`. Honors `${user_config.parallel_agents}`, `${user_config.parallel_test_authors}`, `${user_config.browser_channel}`, `${user_config.browser_headless}`, `${user_config.settle_ms}`, `${user_config.auth_mode}`, `${user_config.task_depth}`, and `${user_config.max_tasks_per_route}`.

## Instructions

**Browser-agent pre-check.** Before spawning any page-analyzer agents, verify `.claude/agents/qa-page-analyzer.md` exists. If not:
```bash
mkdir -p .claude/agents
```
Then read `${CLAUDE_PLUGIN_ROOT}/agents/qa-page-analyzer.md` and write to `.claude/agents/qa-page-analyzer.md`. Do the same for `qa-test-runner.md`. If the files already exist, leave them unchanged.

When spawning route-discoverer and test-author, use the **plugin-namespaced names** (`qa-catalog:route-discoverer`, `qa-catalog:test-author`). When spawning browser agents, use the **project-level names** (`qa-page-analyzer`). All are pre-approved in `allowed-tools` above.

This skill behaves like `/qa-catalog:init` except:

1. It **does not** stop if `QA-tests/` already exists. Instead, back up the current `QA-tests/tasks/` folder to `QA-tests/.qa-catalog/backup-<timestamp>/` before overwriting.
2. Re-run every route through `qa-page-analyzer` (project-level) and `test-author`, ignoring fingerprints.
3. Preserve `QA-tests/.qa-catalog/backup-*/` so the user can diff manually if a regeneration produced worse tasks.

Use `$ARGUMENTS` as the dev URL override if provided; otherwise resolve as `/qa-catalog:init` does.

After the rescan, print the same summary as `/qa-catalog:init` plus the backup location.
