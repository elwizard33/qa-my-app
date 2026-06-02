# QA My App — agent + skill conventions

> Cross-harness canonical context for any agent (Claude Code, Codex CLI, etc.) editing this plugin. `CLAUDE.md` imports this file via `@AGENTS.md` so Claude Code reads it automatically. Keep this file authoritative.

## Repo identity

- **Plugin internal name:** `qa-catalog` (do not rename — every `Agent(qa-catalog:*)` reference, every `/qa-catalog:*` slash command, and every existing install depends on it).
- **User-visible brand:** "QA My App" (set via `displayName` in `.claude-plugin/plugin.json`).
- **Single living audit log:** [docs/AUDIT.md](docs/AUDIT.md). Append a new "Pass N" section per audit. `F-NNN` finding ids are stable forever.

## Component layout

| Path | Purpose | Scope |
|---|---|---|
| `.claude-plugin/plugin.json` | Plugin manifest. Single source of truth for version, license, userConfig. | plugin |
| `.claude-plugin/marketplace.json` | Self-marketplace catalog so users can `/plugin marketplace add elwizard33/qa-my-app`. | marketplace |
| `agents/route-discoverer.md` | Static route discovery from source. | plugin subagent |
| `agents/test-author.md` | Page-analysis JSON → task markdown. | plugin subagent |
| `agents/catalog-reconciler.md` | Drift planner for `/qa-catalog:sync`. | plugin subagent |
| `agents/qa-page-analyzer.md` | Browser-driving element inventory. Each spawn starts its own `npx @playwright/mcp@latest` process. | **project** (copied to `.claude/agents/` by `/qa-catalog:init` Phase 0) |
| `agents/qa-test-runner.md` | Browser-driving task execution → `result.md` + screenshots. | **project** (same as above) |
| `skills/{init,scan,sync,run,run-all}/SKILL.md` | Slash commands `/qa-catalog:*`. | plugin skill |
| `hooks/hooks.json` | `SessionStart` (matcher: `startup`) catalog diff + async `PostToolUse` matcher on `Write\|Edit\|MultiEdit`. | plugin hook |
| `scripts/*.mjs`, `scripts/*.sh` | Pure-stdlib Node helpers + Bash precommit installer. Invoked via `node ${CLAUDE_PLUGIN_ROOT}/scripts/...`. | plugin scripts |
| `.mcp.json` | Bundled Playwright MCP (stdio). Available in the main session and to plugin subagents. | plugin MCP |

## Hard rules (enforced by reviewers + CI)

1. **Plugin subagents must NOT declare `hooks`, `mcpServers`, or `permissionMode`.** Silently ignored per the [docs](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent). The two browser-driving agents (`qa-page-analyzer`, `qa-test-runner`) live at project scope because they need inline `mcpServers`. **They must NOT be auto-loaded as plugin agents** — `plugin.json` declares an explicit `agents` allowlist (`route-discoverer`, `test-author`, `catalog-reconciler` only) so the two browser agents in `agents/` are treated purely as copy-templates, not registered as `qa-catalog:*` agents. If you add a new *plugin-scope* agent, add it to that allowlist too, or it won't load.
2. **`model: inherit` everywhere.** No agent hardcodes a model id. The user's session model is honored. **`effort` is the cost knob, not `model`.** Tune `effort` per agent by how much reasoning the task genuinely needs — reasoning-heavy agents that infer intent from source (`qa-page-analyzer`) keep `effort: high`; deterministic executors that follow a pre-authored task verbatim (`qa-test-runner`) use `effort: medium` to avoid spending extended-thinking output tokens (multiplied across every parallel spawn). Do not raise an agent's `effort` without a reasoning justification.
3. **`disable-model-invocation: true` on every workflow skill.** Slash-only entry; Claude cannot auto-trigger them.
4. **Path portability.** Every script reference uses `${CLAUDE_PLUGIN_ROOT}`. No absolute paths.
5. **Exec form for hook commands.** `command + args` array — never a single shell string (`${CLAUDE_PLUGIN_ROOT}` would be quoted incorrectly).
6. **Timeouts in seconds.** Per [hooks → Common fields](https://code.claude.com/docs/en/hooks#common-fields).
7. **Sensitive userConfig fields → `sensitive: true`.** Stored in OS keychain; exposed via `CLAUDE_PLUGIN_OPTION_<KEY>`.
8. **Pinned `version` in `plugin.json` → bump on every release + update `CHANGELOG.md`.** Users only get updates on bump per [plugin-marketplaces → Version resolution](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution).
9. **CI is the gate.** `claude plugin validate . --strict` runs on both manifests + `node --check` on every `.mjs`. All must pass.
10. **GitHub Actions pinned by commit SHA** with a `# v…` version comment for readability.

## Agent selection convention

Plugin-scope spawn ids use the namespace: `Agent(qa-catalog:route-discoverer)`, `Agent(qa-catalog:test-author)`, `Agent(qa-catalog:catalog-reconciler)`.

Project-scope (browser) spawn ids drop the namespace: `Agent(qa-page-analyzer)`, `Agent(qa-test-runner)`. They are installed into the user's `.claude/agents/` by `/qa-catalog:init` Phase 0 and **must** be committed by the user so the whole team shares the same browser-agent versions.

## Color coding (agent task panel)

| Agent | Color |
|---|---|
| `qa-page-analyzer` | blue |
| `route-discoverer` | green |
| `test-author` | yellow |
| `qa-test-runner` | orange |
| `catalog-reconciler` | purple |

With up to 12 parallel runners + 4 analyzers + 1 supervisor visible during `/qa-catalog:run-all`, color is the only way the user can tell which row is which kind of work.

## Where to look first

- **Adding a new framework adapter:** `scripts/detect-framework.mjs` (detection) + `agents/route-discoverer.md` (per-framework discovery rules).
- **Adding a new userConfig field:** `.claude-plugin/plugin.json` `userConfig` block. If it's an array, use `multiple: true`. If sensitive, use `sensitive: true`.
- **Adding a new hook:** `hooks/hooks.json`. Always include `matcher`, `timeout`, exec form. Use `async: true` for observational/PostToolUse hooks.
- **Adding a new skill:** create `skills/<name>/SKILL.md` with `description`, `when_to_use`, `disable-model-invocation: true`, `allowed-tools`, optional `argument-hint`.

## Don'ts

- ❌ Never write to `QA-tests/tasks/*.md` during a run — they are the input contract for the runner.
- ❌ Never amend a historical audit pass — append a new pass and update the master index.
- ❌ Never delete a `F-NNN` finding — mark its status and leave the entry in the table.
- ❌ Never bypass `claude plugin validate --strict` — if validation fails, fix the manifest, not the CI gate.

## Test before shipping

```powershell
npx -y @anthropic-ai/claude-code plugin validate . --strict
npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict
```
