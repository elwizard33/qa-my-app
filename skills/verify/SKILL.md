---
description: Verify the work in flight — test only what changed. Resolves scope from this conversation + uncommitted git diff (default), a branch/PR range, an explicit path/route, or a connected issue tracker's acceptance criteria (e.g. /qa-my-app:verify PROJ-123). Re-authors the affected tasks so their happy paths fill forms with real data and submit, runs them in a real browser, and reports pass/fail per acceptance criterion. The fast inner-loop counterpart to the full-suite /qa-my-app:run-all.
when_to_use: |
  Use right after making a change to confirm it works, to test a specific page or ticket end-to-end, or to verify a PR before pushing. Trigger phrases include "verify this", "test what I changed", "does my change work", "verify the ticket", "test this page now", "check my PR", "verify PROJ-123", and "test the form I just built".
argument-hint: "[ticket-id | route | path | --branch [base] | --staged]"
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion, Bash(node *), Bash(git *), Bash(mkdir *), Bash(start *), Bash(xdg-open *), Bash(open *), Agent(qa-page-analyzer), Agent(qa-my-app:test-author), Agent(qa-test-runner)
---

# /qa-my-app:verify — Test what changed (or what a ticket asks for)

## Project context
- Catalog present: !`test -f QA-tests/catalog.json && echo YES || echo NO`
- Change scope: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/change-scope.mjs" 2>/dev/null || echo '{"error":"no-catalog"}'`
- Current branch: !`git rev-parse --abbrev-ref HEAD 2>/dev/null`
- Connected MCP servers: !`claude mcp list 2>/dev/null || true`
- Filter argument: `$ARGUMENTS`

## Runtime settings
| Setting | Value |
|---|---|
| Dev URL | `${user_config.dev_url}` |
| Parallel test runners | `${user_config.parallel_test_runners}` |
| Browser engine | `${user_config.browser_engine}` |
| Browser channel / headless | `${user_config.browser_channel}` / `${user_config.browser_headless}` |
| Settle ms | `${user_config.settle_ms}` |
| Auth mode | `${user_config.auth_mode}` |
| Task depth | `${user_config.task_depth}` |

---

## Instructions

If `Catalog present` is `NO`, stop and tell the user to run `/qa-my-app:init` first.

**Browser-agent pre-check.** Before spawning any browser agents, verify `.claude/agents/qa-page-analyzer.md` and `.claude/agents/qa-test-runner.md` exist. If either is missing, `mkdir -p .claude/agents`, then read the matching template from `${CLAUDE_PLUGIN_ROOT}/agents/` and write it, applying the `${user_config.browser_engine}` `mcpServers` block exactly as `/qa-my-app:init` Phase 0 documents. Leave existing files untouched.

When spawning `test-author`, use the plugin-namespaced name (`qa-my-app:test-author`). Browser agents use the project-level names (`qa-page-analyzer`, `qa-test-runner`). All are pre-approved in `allowed-tools`.

### Phase 0 — Resolve scope + acceptance criteria

Interpret `$ARGUMENTS`:

- **Empty (default)** → scope = **this conversation + uncommitted working tree**. Take the `affectedRoutes` from the `Change scope` context block above. ALSO scan the current conversation for routes/pages we just created or edited and union them in (match by route path or `sourceFile` against `catalog.json`). This is the "I just built this, check it" path.
- **An issue/ticket id** (matches `[A-Z]+-\d+` like `PROJ-123`, or a numeric `#123`) → treat as a ticket:
  1. If a Jira/GitHub/Azure DevOps MCP is connected (see `Connected MCP servers`), fetch the ticket and extract its **acceptance criteria** and any route/page names it references. Hold the criteria as `acceptanceCriteria` (a string list).
  2. Map referenced pages → catalog routes. If the ticket doesn't name pages, fall back to the working-tree change scope and attach the criteria to those routes.
  3. If no tracker MCP is connected, tell the user how to connect one (`/qa-my-app:init` Phase 1 prints the commands) and fall back to change-scope for this run.
- **`--branch [base]`** → run `node "${CLAUDE_PLUGIN_ROOT}/scripts/change-scope.mjs" --branch <base>`; scope = everything different from `<base>` (default: repo main). The "verify my whole PR" path.
- **`--staged`** → `change-scope.mjs --staged`; only staged files.
- **A route path** (starts with `/`) → exactly that route's tasks.
- **A file path** → `change-scope.mjs --files <path>`; the routes that file backs.

If scope resolution yields **no routes**, say so plainly and stop (offer `/qa-my-app:run-all` for a full run). If `change-scope.mjs` reports `unmatched` files that look like UI source, mention them — they may be new routes the catalog hasn't seen, in which case suggest `/qa-my-app:sync` first.

Print the resolved scope back to the user before doing work: the routes, their existing tasks, and (if any) the acceptance criteria.

### Phase 1 — Refresh the affected tasks

For each affected route, the underlying page may have changed, so re-derive its tasks rather than trusting stale ones:

1. Spawn `qa-page-analyzer` (one per route, batched up to `${user_config.parallel_agents}`) with the standard analysis payload (same shape as `/qa-my-app:init` Phase 3, secrets resolved via `node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-resolve.mjs" --json` when `auth_mode` is `per-role`).
2. Spawn `qa-my-app:test-author` for each analysis, passing the normal `settings` PLUS:
   ```json
   {
     "acceptanceCriteria": ["<criterion 1>", "<criterion 2>"],
     "changedSummary": "<one-line description of what changed, from the diff/conversation>"
   }
   ```
   Omit `acceptanceCriteria` when there's no ticket. The author overwrites the route's `QA-tests/tasks/T*.md` files with happy paths that **fill forms with the sample data and submit**, validation matrices, and (when criteria were supplied) an `## Acceptance criteria` block.

Collect the final list of task ids to run.

### Phase 2 — Run them

Reuse the `/qa-my-app:run-all` dispatch/verify loop, scoped to just the collected task ids:

1. `runId = <UTC ISO-8601, ':' → '-'>`; `runRoot = QA-tests/results/runs/<runId>`. Create it and one subfolder per task.
2. Write `<runRoot>/run.json` (include `"filter": "<resolved scope>"` and, if present, `"acceptanceCriteria": [...]`).
3. Dispatch `qa-test-runner` subagents in parallel batches of `${user_config.parallel_test_runners}`, exactly as `/qa-my-app:run-all` Phase 2 does (per-role credentials resolved once up front). Each runner fills and submits the forms for real and writes `result.md` with embedded screenshots and — when the task carries acceptance criteria — the `## Acceptance criteria` results table.
4. Verify each result with `node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-result.mjs" "<runRoot>/<taskId>"`; one retry on verification failure.
5. After every state transition, refresh the dashboard: `node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs" "<runRoot>"`.

### Phase 3 — Report

Write `<runRoot>/summary.md` as `/qa-my-app:run-all` does, then append history + render the final dashboard:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/results-index.mjs" append "<runRoot>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs"   "<runRoot>"
```

Print a compact console summary led by the **verdict against the change/ticket**:

```
QA verify  <runId>
  scope:    <conversation+working tree | branch vs main | PROJ-123 | /route>
  routes:   <list>
  tasks:    <N>   pass: <X>   fail: <Y>   blocked: <Z>
  criteria: <P/Q acceptance criteria verified>   (omit if none)
  report:   QA-tests/results/runs/<runId>/report.html   ← open in a browser
  defects:  <DEF-* ids, or "none">
```

If any acceptance criterion is unverified or any task failed, list those first — that's the answer to "does my change work?".

## Style rules
- The skill never drives the browser itself — analysis and execution go through the subagents.
- Always re-author affected tasks before running; a change-scoped verify must reflect the current page, not a stale task.
- Never edit historical runs. `QA-tests/tasks/*.md` are rewritten only in Phase 1, never during the run.
- Keep secrets out of output — resolve credentials via `auth-resolve.mjs`, never print resolved passwords.
