---
description: Run end-to-end tests for some or all pages in this app. Asks the user which routes/tasks to cover (or accepts a filter argument), builds a persistent task-queue index for the run, dispatches batches of test-runner subagents in parallel, verifies each returned result.md against the schema, retries verification failures once, then writes a final cross-task report. Use after a sprint, after a dependency bump, or before a release.
when_to_use: |
  Use to run the full test suite, perform a regression test across all routes, or re-run only failed or changed tasks before a release. Trigger phrases include "run all tests", "full regression", "run the full test suite", "test everything", "run qa", "run all qa tests", "regression before release", and "run failed tests".
argument-hint: [task-filter]
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(node *), Bash(mkdir *), Bash(start *), Bash(xdg-open *), Bash(open *), Agent(qa-test-runner)
---

# /qa-catalog:run-all — Full-platform parallel test run

## Project context
- Catalog present: !`test -f QA-tests/catalog.json && echo YES || echo NO`
- Task count: !`ls QA-tests/tasks/T*.md 2>/dev/null | wc -l`
- Recent runs: !`ls -t QA-tests/results/runs 2>/dev/null | head -3`
- Filter argument: `$ARGUMENTS`

## Runtime settings
| Setting | Value |
|---|---|
| Dev URL | `${user_config.dev_url}` |
| Parallel test runners | `${user_config.parallel_test_runners}` |
| Browser channel | `${user_config.browser_channel}` |
| Headless | `${user_config.browser_headless}` |
| Settle ms | `${user_config.settle_ms}` |
| Auth mode | `${user_config.auth_mode}` |

---

## Instructions

If `Catalog present` is `NO`, stop and tell the user to run `/qa-catalog:init` first.

This skill is the **supervisor**. It owns the task queue, hands work off to `qa-test-runner` (project-level, installed by `/qa-catalog:init` Phase 0) subagents, verifies each returned result, and re-dispatches until the queue is empty. Subagents are stateless workers — they get a task, they execute, they write `result.md` + screenshots, they return one JSON line, they're gone. The supervisor is the only thing that knows the run as a whole.

### Phase 0 — Pick which routes / tasks to test

Read `QA-tests/catalog.json` and `QA-tests/tasks/T*.md` to build the full universe `[{taskId, taskFile, route}]`.

**If `$ARGUMENTS` is non-empty**, resolve it directly — no prompt:
- `T01,T03,T07` or `T01 T03 T07` → exactly those task ids.
- A route prefix (`/customers`) → every task whose catalog entry's route starts with it.
- `failed` → tasks whose most recent entry in `QA-tests/results/history.json` is FAIL or BLOCKED.
- `changed` → tasks whose route source is dirty per `node "${CLAUDE_PLUGIN_ROOT}/scripts/catalog-diff.mjs" --json`.

**If `$ARGUMENTS` is empty**, ask the user **one** `AskUserQuestion` with the catalog's routes as a multi-select:

> Which routes do you want to test? (uncheck any you want to skip)
>
> - [x] `/` — 2 tasks
> - [x] `/customers` — 4 tasks
> - [x] `/customers/:id` — 3 tasks
> - [x] `/orders` — 5 tasks
> - … (one row per route in catalog.json)
> - [ ] Re-run only failing tasks from last run
> - [ ] Re-run only tasks whose source changed

Default every route to **checked**. If the user picks one of the two bottom options, ignore the per-route selection and apply the corresponding filter instead.

Build the **work list** `tasks = [{ taskId, taskFile, route, status: "pending", attempt: 0 }]`.

If the work list is empty, stop and tell the user nothing matched.

### Phase 1 — Prepare run directory + task-queue index

1. `runId = <UTC ISO-8601 second precision, ':' replaced with '-'>` — e.g. `2026-05-28T14-22-11Z`.
2. `runRoot = QA-tests/results/runs/<runId>`.
3. Create `<runRoot>/` and one subfolder per task: `<runRoot>/<taskId>/`.
4. Write `<runRoot>/run.json` with run metadata (immutable for the rest of the run):
   ```json
   {
     "runId": "<runId>",
     "startedAt": "<ISO-8601>",
     "filter": "$ARGUMENTS or 'interactive'",
     "selectedRoutes": ["/customers", "/orders"],
     "settingsSnapshot": { /* the user_config values used */ },
     "taskCount": <N>
   }
   ```
5. Write `<runRoot>/task-queue.json` — **this is the persistent index that drives the loop**. Re-read and re-write it after every state transition so the run is resumable and auditable. After **every** save of `task-queue.json`, also run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs" "<runRoot>"
   ```
   This refreshes `<runRoot>/report.html` — a self-contained, auto-refreshing HTML dashboard the user can keep open in a browser tab to watch progress live (meta-refresh every 3s while the run is in flight; refresh disables itself once the run is complete).

   ```json
   {
     "runId": "<runId>",
     "updatedAt": "<ISO-8601>",
     "tasks": [
       {
         "taskId": "T01-customers-list",
         "taskFile": "QA-tests/tasks/T01-customers-list.md",
         "route": "/customers",
         "status": "pending",        // pending | dispatched | verifying | complete | failed-verification
         "attempt": 0,
         "startedAt": null,
         "finishedAt": null,
         "verdict": null,            // PASS | FAIL | BLOCKED (after verification)
         "tcCount": null,
         "passCount": null,
         "failCount": null,
         "blockedCount": null,
         "screenshots": null,
         "consoleErrors": null,
         "networkFailures": null,
         "defects": [],
         "verificationIssues": []    // filled if verify-result.mjs rejected the runner's output
       }
     ]
   }
   ```
6. Render the initial dashboard so the user can open it before the first task lands:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs" "<runRoot>"
   ```
   Print the absolute path to `<runRoot>/report.html` to the console so the user can open it. On Windows, you may additionally invoke `start "" "<runRoot>/report.html"` to auto-open it; on macOS, `open`; on Linux, `xdg-open`. Skip the auto-open if you're unsure of the platform.

### Phase 2 — Dispatch / verify / update loop

The loop runs until **every** task in the queue has `status` ∈ `{ complete, failed-verification }`. Hold at most `${user_config.parallel_test_runners}` runners in flight at any moment.

Repeat:

1. **Pick work.** Re-read `task-queue.json`. Collect tasks with `status === "pending"`. If none AND nothing is in flight → exit the loop. Otherwise take up to `parallel_test_runners − inFlight` of them.

2. **Mark dispatched.** For each picked task:
   - Set `status = "dispatched"`, `attempt += 1`, `startedAt = <ISO-8601>`.
   - Save `task-queue.json`.

3. **Hand off.** Spawn the project-level agent **`qa-test-runner`** for each picked task, in parallel within the batch. Each spawn gets its own Playwright process — no context coordination needed. Payload:
   ```json
   {
     "taskId":    "<id>",
     "taskFile":  "<repo-relative path>",
     "runDir":    "<repo-relative runRoot>/<taskId>",
     "runId":     "<runId>",
     "devUrl":    "${user_config.dev_url}",
     "settings": {
       "browserChannel":   "${user_config.browser_channel}",
       "headless":         ${user_config.browser_headless},
       "settleMs":         ${user_config.settle_ms},
       "authMode":         "${user_config.auth_mode}",
       "credentials":      { "username": "${user_config.auth_username}", "password": "${user_config.auth_password}" },
       "storageStatePath": "${user_config.auth_storage_state_path}"
     }
   }
   ```

4. **Wait for the batch to report back.** Each runner returns one JSON line with `{ taskId, claimedResult, screenshotsClaimed }` and has written `result.md` + screenshots into `<runDir>/<taskId>/`.

5. **Verify mechanically.** For each returned task, run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/verify-result.mjs" "<runRoot>/<taskId>"
   ```
   The script returns a single-line JSON with `{ taskId, valid, issues, parsed }` and exits 0/1. It checks:
   - all required header table fields are present (`Result`, `Task file`, `Route`, `Date (UTC)`, `Run id`, `Duration (s)`, `Screenshots`, `Console errors`, `Network failures`);
   - top-level `Result` is one of `PASS | FAIL | BLOCKED`;
   - every `### TC-NN` section ends with a `— PASS | FAIL | BLOCKED` verdict;
   - verdict consistency (no TC failed AND top-level PASS, etc.);
   - every `![](file.png)` reference resolves to a file in the task dir;
   - the `Screenshots` count is internally consistent;
   - the `Defects Found` section contains `DEF-`/`ERR-` ids when the top-level Result is FAIL, or an explicit "None".

6. **Update the queue:**
   - **If valid** → set `status = "complete"`, copy `parsed.{result → verdict, tcCount, passCount, failCount, blockedCount, screenshotsOnDisk → screenshots, consoleErrors, networkFailures, defects}` onto the task entry, `finishedAt = <ISO-8601>`.
   - **If invalid AND `attempt < 2`** → set `status = "pending"`, record `verificationIssues = issues`. The loop will pick it back up and re-dispatch with a fresh `contextId`.
   - **If invalid AND `attempt === 2`** → set `status = "failed-verification"`, `verdict = "BLOCKED"`, persist `verificationIssues`. The runner produced unparseable output twice — that's a real defect and gets surfaced in the summary.
   - Save `task-queue.json` after every transition, **and immediately** re-run:
     ```bash
     node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs" "<runRoot>"
     ```
     so the open browser tab picks up the new state on its next auto-refresh tick.

7. **Loop.**

### Phase 3 — Final report

Once the loop exits, derive the summary from `task-queue.json` only (single source of truth). Write `<runRoot>/summary.md` following the schema we agreed on for results — header table + per-task table + a verification-failures block:

```markdown
# QA My App run — <runId>

| Field | Value |
|---|---|
| Started (UTC) | <ISO-8601> |
| Finished (UTC) | <ISO-8601> |
| Duration | <hh:mm:ss> |
| Filter | <argument or "interactive: routes /customers,/orders"> |
| Tasks executed | <N> |
| Pass | <X> |
| Fail | <Y> |
| Blocked | <Z> |
| Failed verification | <V> |
| Total screenshots | <S> |
| Console errors | <C> |
| Network failures | <NF> |
| Parallel runners | <user_config.parallel_test_runners> |
| Browser | <channel> / headless=<bool> |

## Task results
| Task | Route | Result | Attempts | Duration | Screenshots | Errors | Details |
|---|---|---|---|---|---|---|---|
| T01-customers-list | /customers | PASS    | 1 | 22s | 5 | 0 | [result](T01-customers-list/result.md) |
| T03-customers-edit | /customers/:id | FAIL | 1 | 41s | 8 | 1 | [result](T03-customers-edit/result.md) — DEF-bad-validation |
| T07-orders-bulk    | /orders        | BLOCKED (verification) | 2 | — | — | — | [result](T07-orders-bulk/result.md) — schema issues: missing TC-04 verdict |

## Defects Found
- DEF-bad-validation — T03-customers-edit
- … (deduped across the run)

## Verification failures
- T07-orders-bulk (attempt 1): no `### TC-NN ... — PASS|FAIL|BLOCKED` headers found
- T07-orders-bulk (attempt 2): screenshot file(s) missing on disk: TC03-confirm.png
```

### Phase 4 — Append to history index + final dashboard render

Run, in order:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/results-index.mjs" append "<runRoot>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs"   "<runRoot>"
```
The first updates `QA-tests/results/history.json`, `QA-tests/results/latest.json`, and `QA-tests/results/by-task/<taskId>/latest.json`. The second writes a final, non-refreshing `<runRoot>/report.html` (with the "live" dot dimmed, auto-refresh disabled, and the total run duration in the header) so the dashboard becomes the canonical browse view for the run.

### Phase 5 — Print compact console summary

```
QA My App run-all  <runId>
  selection: <interactive routes | filter arg>
  tasks:    <N>   pass: <X>   fail: <Y>   blocked: <Z>   verif-failed: <V>
  results:  QA-tests/results/runs/<runId>/summary.md
  report:   QA-tests/results/runs/<runId>/report.html    ← open in a browser
  queue:    QA-tests/results/runs/<runId>/task-queue.json
  defects:  <list of DEF-* ids> (or "none")
```

---

## Style rules

- **The supervisor never executes a task itself.** All browser work goes through `qa-test-runner` subagents.
- **`task-queue.json` is the source of truth during the run.** Read it before every dispatch, write it after every state transition. The summary at the end is derived from it.
- **Always launch full-parallel batches up to `parallel_test_runners`.** Do NOT serialize unless the work list has exactly one task.
- **One retry on verification failure**, no retry on runner exception (that's `BLOCKED` immediately — the runner couldn't even start).
- A task is **not** "complete" until `verify-result.mjs` says so. The runner's self-report is advisory, not authoritative.
- Never modify `QA-tests/tasks/*.md` during a run — those are the input contract.
- Never edit historical runs — `task-queue.json` belongs to its own run dir; `history.json` is append-only.
