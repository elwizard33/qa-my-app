---
description: Execute a single QA task end-to-end via the qa-test-runner subagent (project-level, installed by /qa-my-app:init). Writes a date-stamped result.md with per-TC pass/fail, embedded screenshots, console errors, and network failures, then appends to QA-tests/results/history.json. Argument is the task id (e.g. T03 or T03-customers-create).
when_to_use: |
  Use to execute a single QA task, test one specific page or user flow, or re-run a previously failing test case in the browser. Trigger phrases include "run task", "test this page", "run T01", "execute a test", "run one qa test", and "test the customers page".
argument-hint: <task-id>
disable-model-invocation: true
allowed-tools: Read, Glob, Write, Edit, Bash(node *), Bash(mkdir *), Bash(start *), Bash(xdg-open *), Bash(open *), Agent(qa-test-runner)
---

# /qa-my-app:run — Execute one task

## Project context
- Task id: `$ARGUMENTS`
- Task file: !`ls QA-tests/tasks/$ARGUMENTS*.md 2>/dev/null | head -1`
- Catalog present: !`test -f QA-tests/catalog.json && echo YES || echo NO`

## Runtime settings
| Setting | Value |
|---|---|
| Dev URL | `${user_config.dev_url}` |
| Browser channel | `${user_config.browser_channel}` |
| Headless | `${user_config.browser_headless}` |
| Settle ms | `${user_config.settle_ms}` |
| Auth mode | `${user_config.auth_mode}` |

## Instructions

Locate the task file matching `$ARGUMENTS`. If none found, list available task ids and stop.

### Phase 1 — Prepare run directory
1. Generate `runId` as a UTC ISO-8601 timestamp with `:` replaced by `-` (example: `2026-05-28T14-22-11Z`).
2. Resolve `runDir = QA-tests/results/runs/<runId>/<taskId>` and create it (`mkdir -p`).
3. Write `QA-tests/results/runs/<runId>/run.json`:
   ```json
   {
     "runId": "<runId>",
     "startedAt": "<ISO-8601>",
     "filter": "$ARGUMENTS",
     "settingsSnapshot": { ...effective user_config values... },
     "tasks": [{ "taskId": "<id>", "taskFile": "<path>", "route": "<route>" }]
   }
   ```

### Phase 2 — Dispatch the runner

**Resolve per-role credentials first.** When `auth_mode` is `per-role`, load the credential map (secrets interpolated from env vars):
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-resolve.mjs" --json
```
Use the returned `roles` object as `credentialsByRole`. If the file is absent (`present: false`) or `auth_mode` is not `per-role`, omit `credentialsByRole` and let the runner fall back to the single shared credential below. Never print resolved passwords back to the user.

**Resolving the shared password.** `auth_password` is declared `sensitive: true`, so Claude Code stores it in the OS keychain and **never substitutes it into skill or agent content** — writing `${user_config.auth_password}` here would hand the runner that literal string, not the password. When `auth_mode` is `shared-credentials`, resolve the credential through the same script instead:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-resolve.mjs" --role "${user_config.default_role}" --json
```

Give the default role a `shared-credentials` entry in `QA-tests/.qa-catalog/auth.local.json` whose `password` is a `${ENV_VAR}` reference. If that lookup returns `resolved: false`, tell the user which env var is missing and stop before running protected tasks — do not fall back to an empty password.

Spawn the project-level agent **`qa-test-runner`** with this payload:

```json
{
  "taskId":   "<resolved id>",
  "taskFile": "<repo-relative task file>",
  "runDir":   "<runDir>",
  "runId":    "<runId>",
  "devUrl":   "${user_config.dev_url}",
  "settings": {
    "browserChannel": "${user_config.browser_channel}",
    "headless":       ${user_config.browser_headless},
    "settleMs":       ${user_config.settle_ms},
    "authMode":       "${user_config.auth_mode}",
    "defaultRole":    "${user_config.default_role}",
    "credentials":    { "username": "${user_config.auth_username}", "password": "<resolved via auth-resolve.mjs — never ${user_config.auth_password}>" },
    "credentialsByRole": { ...roles object from auth-resolve.mjs, or omit if not per-role... },
    "storageStatePath": "${user_config.auth_storage_state_path}"
  }
}
```

The runner writes `<runDir>/result.md` and embeds every screenshot inline.

### Phase 3 — Append to the run history + render dashboard
Run, in order:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/results-index.mjs" append "QA-tests/results/runs/<runId>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/render-report.mjs"   "QA-tests/results/runs/<runId>"
```
The first updates `QA-tests/results/history.json`, `QA-tests/results/latest.json`, and `QA-tests/results/by-task/<taskId>/latest.json`. The second writes `QA-tests/results/runs/<runId>/report.html` — a self-contained HTML dashboard for the run (single-task runs render with auto-refresh off since the work is already done by the time we get here).

### Phase 4 — Print summary
Print the runner's single-line JSON summary plus the absolute paths to both `result.md` and `report.html`.

## Result schema (enforced by the runner)
See [`agents/qa-test-runner.md`](../../agents/qa-test-runner.md) for the full result.md template. Highlights:
- `| Result | PASS / FAIL |` machine-parseable header table.
- One `### TC-NN:` section per test case from the task file.
- Screenshots embedded as `![alt](TCNN-step.png)` — never a table.
- Trailing `## Defects Found` section using `DEF-<slug>` ids.
