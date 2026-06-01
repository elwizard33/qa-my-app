---
description: Bootstrap a fresh QA-tests/ folder in this project. Auto-detects the framework, discovers every route, loads each page in a real browser, inventories every form/button/modal/role guard, and writes deep test tasks. Use on a new project or to re-baseline the catalog. Optional argument is the dev server URL (defaults to the configured value, then to the framework-detected default).
when_to_use: |
  Use when setting up QA testing for the first time, generating a QA catalog from scratch, or re-baselining the entire test suite. Trigger phrases include "set up QA", "generate tests", "init qa", "create test catalog", "bootstrap tests", and "start QA from scratch".
argument-hint: [dev-server-url]
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion, Bash(node *), Bash(git *), Bash(mkdir *), Bash(claude mcp *), Agent(qa-catalog:route-discoverer), Agent(qa-page-analyzer), Agent(qa-catalog:test-author)
---

# /qa-catalog:init — Bootstrap QA-tests/

## Project context
- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || pwd`
- Framework detection: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/detect-framework.mjs"`
- Existing QA-tests folder: !`test -d QA-tests && echo "EXISTS" || echo "MISSING"`

## Runtime settings (from `/plugin` user config)
| Setting | Value |
|---|---|
| Dev URL override | `${user_config.dev_url}` |
| Parallel page-analyzer agents | `${user_config.parallel_agents}` |
| Parallel test-author agents | `${user_config.parallel_test_authors}` |
| Browser engine | `${user_config.browser_engine}` |
| Browser channel | `${user_config.browser_channel}` |
| Headless | `${user_config.browser_headless}` |
| Settle ms | `${user_config.settle_ms}` |
| Auth mode | `${user_config.auth_mode}` |
| Default role | `${user_config.default_role}` |
| Available roles | `${user_config.available_roles}` |
| Task depth | `${user_config.task_depth}` |
| Max tasks per route | `${user_config.max_tasks_per_route}` |
| Excluded globs | `${user_config.exclude_globs}` |

If any value is empty, fall back to a sensible default.

## Instructions

When spawning subagents, use the **plugin-namespaced names** for the non-browser agents (`qa-catalog:route-discoverer`, `qa-catalog:test-author`) and the **project-level name** for the browser agent (`qa-page-analyzer`, installed in Phase 0 below). All are pre-approved in `allowed-tools` above.

If `Existing QA-tests folder` is `EXISTS`, **stop** and tell the user to run `/qa-catalog:sync` instead, or delete `QA-tests/` first.

Resolve the effective dev URL in this order: `$ARGUMENTS` → `${user_config.dev_url}` → framework-detected `devUrl`.

### Phase 0 — Install project-level browser agents

Before anything else, install the two browser-driving agents into `.claude/agents/` so every subsequent parallel spawn gets its own isolated browser process. These agents declare `mcpServers` inline — a capability that is blocked on plugin-shipped agents but fully supported in project-level agents.

```bash
mkdir -p .claude/agents
```

For each of the two template files, check whether the project-level copy already exists. If it does not, read the template from the plugin directory and write it to the project:

- Read `${CLAUDE_PLUGIN_ROOT}/agents/qa-page-analyzer.md` → write to `.claude/agents/qa-page-analyzer.md`
- Read `${CLAUDE_PLUGIN_ROOT}/agents/qa-test-runner.md` → write to `.claude/agents/qa-test-runner.md`

If either file already exists (e.g. the user has customised it), leave it unchanged.

**Apply the selected browser engine.** The templates ship with the Playwright `mcpServers` block. If `${user_config.browser_engine}` is **not** `playwright` (or empty), edit the freshly-written `.claude/agents/qa-page-analyzer.md` **and** `.claude/agents/qa-test-runner.md`, replacing the `mcpServers:` frontmatter block with the one matching the chosen engine. Do not touch a file you left unchanged because it already existed.

- `chrome-devtools`:
  ```yaml
  mcpServers:
    - chrome-devtools:
        type: stdio
        command: npx
        args: ["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]
  ```
  (Drop `--headless` if `${user_config.browser_headless}` is `false`. Chrome-only.)
- `stagehand` (Browserbase cloud, requires `BROWSERBASE_API_KEY` in the environment):
  ```yaml
  mcpServers:
    - browserbase:
        type: http
        url: "https://mcp.browserbase.com/mcp?browserbaseApiKey=${BROWSERBASE_API_KEY}"
  ```

See [docs/browsers/](../../docs/browsers/README.md) for per-engine setup and caveats (Stagehand has limited screenshot/console/network capture).

> **Why this matters.** Plugin-shipped subagents cannot declare inline `mcpServers` ([silently ignored per the docs](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent) for security), so they would all have to share the single MCP server declared in `.mcp.json`. Sharing requires per-spawn isolation that `@playwright/mcp` does not expose — parallel runs would bleed cookies/localStorage across agents. The project-level agents each start their own browser subprocess (or cloud session) — true isolation with no coordination needed.

---

### Phase 1 — Issue-tracker MCP setup (optional, one-time)

Before scanning, surface a one-time `AskUserQuestion` asking which issue-tracker integrations to wire up. These are not bundled — they're standard MCP servers the user grants tokens to so the runner can later file defects, link tasks to issues, and attach PR previews.

First, check what is already connected:

```bash
claude mcp list 2>/dev/null || true
```

Then ask the user (single multi-select question):

> Which issue trackers should the catalog link to? (you can re-run later via `claude mcp add`)
>
> - [ ] GitHub  — file defects as Issues, attach to PRs
> - [ ] Jira (Atlassian)  — file defects as tickets, link routes to epics
> - [ ] Azure DevOps  — file defects as Work Items, link to boards
> - [ ] Skip for now

For each selected integration, **print exact copy-paste commands** — do NOT run them yourself, since they require user credentials and OAuth in a browser:

- **GitHub** (HTTP MCP, PAT-based):
  ```
  claude mcp add --transport http --scope user github https://api.githubcopilot.com/mcp/ \
    --header "Authorization: Bearer <YOUR_GITHUB_PAT>"
  ```
  Generate a fine-grained PAT at https://github.com/settings/personal-access-tokens.

- **Jira** (Atlassian remote MCP, OAuth):
  ```
  claude mcp add --transport http --scope user atlassian https://mcp.atlassian.com/v1/sse
  /mcp     # then complete OAuth in the browser
  ```

- **Azure DevOps** (community stdio MCP, PAT-based):
  ```
  claude mcp add --transport stdio --scope user ado --env ADO_PAT=<YOUR_ADO_PAT> --env ADO_ORG=<your-org> \
    -- npx -y @azure-devops/mcp-server
  ```

Record the user's selection in the catalog's `integrations` field (Phase 4) so future runs know which tracker IDs are link-able. Do not block init on this — if the user picks **Skip**, proceed immediately.

After the user runs the commands they chose, ask them to type `/mcp` to verify the new servers are connected, then continue.

### Phase 2 — Discover routes
Spawn the **`route-discoverer`** subagent (single instance) with the framework JSON plus the resolved settings:

```json
{
  "framework": "<detected>",
  "routeGlobs": [...],
  "devUrl": "<resolved>",
  "settings": {
    "availableRoles": [split user_config.available_roles by ","],
    "defaultRole": "${user_config.default_role}",
    "excludeGlobs": [split user_config.exclude_globs by ","]
  }
}
```

It returns a rich JSON array (path, sourceFile, requiresAuth, rolesAllowed, guards, httpMethods, dynamicParams, layoutChain, featureFlags).

### Phase 3 — Analyze pages (parallel, isolated browser processes)
Run **`qa-page-analyzer`** subagents in concurrent batches of `${user_config.parallel_agents}`. Each spawn starts its own Playwright process — no shared state, no coordination needed.

Per-agent input:
```json
{
  "route": { ...route record... },
  "devUrl": "<resolved>",
  "settings": {
    "browserChannel": "${user_config.browser_channel}",
    "headless": ${user_config.browser_headless},
    "settleMs": ${user_config.settle_ms},
    "authMode": "${user_config.auth_mode}",
    "credentials": { "username": "${user_config.auth_username}", "password": "${user_config.auth_password}" },
    "storageStatePath": "${user_config.auth_storage_state_path}"
  }
}
```

If a route requires authentication and `auth_mode` is `none`, record `requiresAuth: true` and the auth-wall behavior in the analysis — do not skip it.

### Phase 4 — Author tasks (parallel)
For each Page Analysis, spawn a **`test-author`** subagent. Run up to `${user_config.parallel_test_authors}` concurrently. Pass each agent:

```json
{
  "analysis": { ...page-analyzer output... },
  "settings": {
    "taskDepth": "${user_config.task_depth}",
    "maxTasksPerRoute": ${user_config.max_tasks_per_route},
    "defaultRole": "${user_config.default_role}"
  }
}
```

It writes `QA-tests/tasks/T<NN>-<slug>.md` files using the enforced deep-workflow template.

### Phase 5 — Write catalog
After all tasks are authored, write:

1. `QA-tests/catalog.json` — machine-readable index. Schema:
   ```json
   {
     "version": 3,
     "generatedAt": "<ISO-8601>",
     "framework": "<from detection>",
     "devUrl": "<used>",
     "stack": {
       "languages": ["typescript", "javascript"],
       "runtime": "node",
       "packageManager": "pnpm",
       "buildTool": "vite",
       "repoType": "monorepo-turborepo",
       "uiLibraries": ["shadcn-ui", "radix"],
       "stateManagement": ["zustand"],
       "forms": ["react-hook-form"],
       "validation": ["zod"],
       "httpClient": ["tanstack-query"],
       "styling": ["tailwind"],
       "testFrameworks": ["vitest", "testing-library-react"],
       "e2eFrameworks": ["playwright"],
       "nodeVersion": ">=20"
     },
     "integrations": {
       "github":    { "enabled": true,  "mcpServer": "github"    },
       "jira":      { "enabled": false, "mcpServer": null         },
       "azureDevOps":{ "enabled": false, "mcpServer": null        }
     },
     "settingsSnapshot": { "...": "resolved settings" },
     "routes": [
       {
         "path": "/customers",
         "sourceFile": "...",
         "fingerprint": "<sha256>",
         "requiresAuth": true,
         "rolesAllowed": ["admin"],
         "guards": ["withAuth"],
         "httpMethods": ["GET"],
         "tasks": ["T01-customers-list", "T02-customers-create"]
       }
     ]
   }
   ```
   The `stack` block is sourced verbatim from `detect-framework.mjs` output. The `integrations` block records the Phase 0 selection so the test-runner can later file defects against the chosen tracker via its MCP.
2. `QA-tests/catalog.md` — human-readable table grouped by route, with columns: Path • Auth • Roles • Tasks.
3. `QA-tests/routes/<slug>.md` — one file per route containing the raw Page Analysis (element inventory).
4. `QA-tests/.qa-catalog/fingerprints.json` — `{ "<sourceFile>": "<sha256>" }` for every analyzed source file. Compute SHAs with: `node "${CLAUDE_PLUGIN_ROOT}/scripts/fingerprint.mjs" <files...>`.

### Phase 6 — Install pre-commit hook (optional but recommended)
Run:
```
bash "${CLAUDE_PLUGIN_ROOT}/scripts/install-precommit.sh"
```
This writes `.git/hooks/pre-commit` that re-fingerprints staged files and blocks the commit if `QA-tests/catalog.json` is stale, prompting the user to run `/qa-catalog:sync`.

### Phase 7 — Summary
Print:
- Framework + dev URL used
- N routes discovered (M protected, K role-restricted)
- T tasks authored across D depth level
- Effective parallelism used
- Path to `QA-tests/catalog.md`
- Reminder: run `/qa-catalog:sync` after code changes, or let the file-change hook nudge you.
- Note: `.claude/agents/qa-page-analyzer.md` and `.claude/agents/qa-test-runner.md` were installed. Commit them so the whole team shares the same browser-agent versions.
