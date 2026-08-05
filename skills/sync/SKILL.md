---
description: Re-scan only the routes whose source files changed since the last catalog generation, then patch QA-tests/catalog.json with adds/updates/removes. Run after pulling changes, before committing, or whenever the file-change hook prompts you. Idempotent. Honors plugin user-config for parallelism, auth, and task depth.
when_to_use: |
  Use after pulling new code, after modifying route source files, or when the file-change hook flags the catalog as stale. Trigger phrases include "sync catalog", "update tests", "catalog is stale", "routes changed", "sync qa", "update qa catalog", and "reconcile tests".
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *), Bash(git *), Bash(mkdir *), Agent(qa-my-app:route-discoverer), Agent(qa-page-analyzer), Agent(qa-my-app:test-author), Agent(qa-my-app:catalog-reconciler)
---

# /qa-my-app:sync — Reconcile catalog with current code

## Project context
- Catalog present: !`test -f QA-tests/catalog.json && echo YES || echo NO`
- Drift report: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/catalog-diff.mjs" --json 2>/dev/null || echo '{"error":"no-catalog"}'`
- Framework: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-framework.mjs"`
- Recent changes: !`git diff --name-only HEAD~5..HEAD 2>/dev/null | head -100`

## Runtime settings
| Setting | Value |
|---|---|
| Parallel page-analyzer agents | `${user_config.parallel_agents}` |
| Parallel test-author agents | `${user_config.parallel_test_authors}` |
| Browser engine | `${user_config.browser_engine}` |
| Browser channel / headless | `${user_config.browser_channel}` / `${user_config.browser_headless}` |
| Auth mode | `${user_config.auth_mode}` |
| Task depth | `${user_config.task_depth}` |

## Instructions

**Browser-agent pre-check.** Before spawning any page-analyzer agents, verify `.claude/agents/qa-page-analyzer.md` exists. If not:
```bash
mkdir -p .claude/agents
```
Then read `${CLAUDE_PLUGIN_ROOT}/agents/qa-page-analyzer.md` and write to `.claude/agents/qa-page-analyzer.md`. Do the same for `qa-test-runner.md`. If the files already exist, leave them unchanged. For any file you **just created**, if `${user_config.browser_engine}` is not `playwright` (or empty), replace its `mcpServers:` frontmatter block with the one for the selected engine exactly as documented in `/qa-my-app:init` Phase 0 and [docs/browsers/](../../docs/browsers/README.md).

When spawning catalog-reconciler, route-discoverer, and test-author, use the **plugin-namespaced names** (`qa-my-app:catalog-reconciler`, `qa-my-app:route-discoverer`, `qa-my-app:test-author`). When spawning browser agents, use the **project-level name** (`qa-page-analyzer`). All are pre-approved in `allowed-tools` above.

If `Catalog present` is `NO`, **stop** and tell the user to run `/qa-my-app:init` first.

The drift report JSON has this shape:
```json
{
  "stale":   [{ "path": "/customers", "sourceFile": "...", "oldFingerprint": "...", "newFingerprint": "..." }],
  "removed": [{ "path": "/legacy", "sourceFile": "..." }],
  "added":   ["app/reports/page.tsx", "..."]
}
```

### Phase 1 — Reconcile
Spawn the **`catalog-reconciler`** subagent with the drift report. It returns a plan:
```json
{
  "rescan":  ["/customers"],
  "delete":  ["T07-legacy-export"],
  "discover": true
}
```

### Phase 2 — Execute plan
- If `plan.discover`: spawn `route-discoverer` restricted to the `added` files; merge new routes into the work list.
- For each route in `plan.rescan` ∪ newly-discovered: spawn `qa-page-analyzer` then `test-author` in parallel batches of `${user_config.parallel_agents}` and `${user_config.parallel_test_authors}` respectively, with the same settings payloads as `/qa-my-app:init`. Each `qa-page-analyzer` spawn gets its own browser process (or cloud session) — no `contextId` needed for isolation.
- For each task in `plan.delete`: remove `QA-tests/tasks/<task>.md`. If a route is removed entirely, also remove its `QA-tests/routes/<slug>.md`.

### Phase 3 — Patch catalog
- Update `QA-tests/catalog.json` in place: bump `generatedAt`, refresh `settingsSnapshot`, update `routes[].fingerprint` and `rolesAllowed`/`requiresAuth`/`guards`/`httpMethods` for rescanned items, add/remove route entries.
- Regenerate `QA-tests/catalog.md` from the JSON.
- Update `QA-tests/.qa-catalog/fingerprints.json`.

### Phase 4 — Summary
- `~ N` routes updated
- `+ M` routes added
- `- K` routes removed
- `~ X` tasks rewritten, `+ Y` new, `- Z` deleted

If nothing changed, print "Catalog is up to date." and exit.
