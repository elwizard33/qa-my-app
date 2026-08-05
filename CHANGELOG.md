# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-08-05

First stable release, and the baseline submitted to the Claude Code community
plugin marketplace.

### Changed — BREAKING
- **Plugin renamed `qa-catalog` → `qa-my-app`.** The plugin now matches the repo,
  the marketplace, and the docs site. Every slash command moves from
  `/qa-catalog:*` to `/qa-my-app:*`, and every plugin subagent id from
  `qa-catalog:<name>` to `qa-my-app:<name>`. **Existing installs must reinstall**
  (`/plugin uninstall qa-catalog@qa-my-app` then
  `/plugin install qa-my-app@qa-my-app`). The name is now fixed: once a plugin is
  published to the community catalog its slug is immutable. The `QA-tests/.qa-catalog/`
  data directory is **unchanged**, so existing catalogs, fingerprints, and
  `auth.local.json` files keep working.
- **Browser MCP versions are pinned.** `@playwright/mcp@latest` → `@playwright/mcp@0.0.78`
  and `chrome-devtools-mcp@latest` → `chrome-devtools-mcp@1.6.0`, in the agent
  templates and every doc. Floating `@latest` meant each spawn could fetch and
  execute a different build than the one that was reviewed.

### Fixed
- **Shared-credentials auth was broken.** `/qa-my-app:init`, `:run`, and `:run-all`
  inlined `${user_config.auth_password}` into the subagent payload, but Claude Code
  never substitutes `sensitive: true` config into skill or agent content — the
  runner received that literal string instead of the password. All three skills now
  resolve the credential through `scripts/auth-resolve.mjs`, which interpolates
  `${ENV_VAR}` references and fails loudly when one is unset.

### Removed
- **`.mcp.json` (session-level Playwright MCP).** It loaded the browser tool
  descriptions into every main conversation while nothing outside the subagents
  used them; both browser agents already carry self-contained inline `mcpServers`
  blocks. Removing it cuts the plugin's per-session context cost with no loss of
  function.

### Changed
- `/qa-my-app:status` and `/qa-my-app:verify` are now **model-invocable** — Claude can
  trigger them from phrasing like "is QA set up?" or "verify what I changed".
  `disable-model-invocation: true` also suppresses a skill's description entirely,
  so their `when_to_use` trigger phrases previously could never fire. The five
  skills that overwrite the catalog or spawn browser runs (`init`, `scan`, `sync`,
  `run`, `run-all`) remain user-invocable only.

## [0.1.0] — 2026-06-12

### Added
- **`/qa-my-app:status` — read-only health + inventory snapshot.** Reports browser-agent install state, catalog framework/route/task counts, configured issue trackers, drift vs. source, per-role credential resolution, and the last run's pass/fail/blocked totals. Backed by `scripts/status.mjs` (supports `--json`). Brings the skill count to seven.
- **`/qa-my-app:verify` — change/ticket-scoped inner loop.** Resolves what to test from this conversation + the uncommitted git diff (default), a `--branch [base]` PR range, `--staged`, an explicit route/path, or a connected issue tracker's **acceptance criteria** (`/qa-my-app:verify PROJ-123`). Re-authors only the affected tasks, runs them, and reports pass/fail **per acceptance criterion**. The fast counterpart to the full-suite `/qa-my-app:run-all`.
- `scripts/change-scope.mjs` — maps changed source files onto `catalog.routes[].sourceFile`/`layoutChain` to find the affected routes + tasks. Pure Node + git; modes `--staged`, `--branch [base]`, `--files`.
- `test-author` accepts `settings.acceptanceCriteria` (emits an `## Acceptance criteria` block mapping each criterion to its TCs) and `settings.changedSummary` (biases happy-path/edge cases toward what changed), and now reads the route source directly for exact validation rules.

### Changed
- **The test runner now actually submits.** `qa-test-runner` fills every form/dialog with the task's `Test data` and submits it for real, then asserts the observable result (success toast, new/updated row, error banner) — instead of the previous read-only posture that avoided all state mutation. Only **destructive** actions (delete/remove/destroy) remain gated behind explicit task authorization; the cancel path is always exercised. Results gain an `## Acceptance criteria` table when the task carries criteria.
- `test-author` happy-path template now mandates fill-every-field → submit → assert-concrete-result (and optional reload-to-confirm-persistence); a form on the page always produces a real-submission task, not just a validation task.
- `qa-page-analyzer` emits a `sampleValid`/`sampleInvalid` value per field so authored submissions use realistic data derived from the field's real constraints.

### Added (auth, from earlier in this cycle)
- **Per-role QA credentials.** New `auth_mode: per-role` plus an `auth_credentials_file` setting. `/qa-my-app:init` scaffolds a gitignored `QA-tests/.qa-catalog/auth.local.json` credential map (one login per role; passwords referenced via `${ENV_VAR}`, never written as plaintext) and gitignores `QA-tests/.qa-catalog/state/`.
- `scripts/auth-resolve.mjs` — read-only resolver that interpolates env-var passwords and returns the `credentialsByRole` map (`--json`) or a redacted health report (`--status`). Never writes secrets.
- `qa-test-runner` now reads each task's `Required role`, selects the matching credential, logs in as that role, reports the role used, and BLOCKS (with a `DEF-missing-credential-<role>` defect) when the role's credential is unresolved.
- `qa-page-analyzer` analyzes protected routes as the route's role using the per-role map.
- `test-author` emits an explicit `Required role` metadata field per task and points the sign-in step at the credential map instead of the previously-undocumented `auth.md`.
- `route-discoverer` now traces guards up to two import hops (HOC / middleware / `[Authorize]` / RBAC tables) to infer `rolesAllowed` from backend logic, not just surface patterns.
- `catalog.json` gains a secret-free `auth` block (`mode`, `defaultRole`, `credentialSource`, `rolesUsed`, `rolesConfigured`); `/qa-my-app:status` reports per-role credential resolution health.

## [0.1.0] — initial release

### Added
- Three plugin subagents: `route-discoverer`, `test-author`, `catalog-reconciler`.
- Two project-scope browser subagents (`qa-page-analyzer`, `qa-test-runner`), each spawning its own browser MCP process; installed into `.claude/agents/` by `/qa-my-app:init`.
- Five slash skills: `init`, `scan`, `sync`, `run`, `run-all`.
- `plugin.json` declares an explicit `agents` allowlist so the project-scope browser agents ship in `agents/` purely as copy-templates and are not double-registered as plugin agents.
- Bundled Playwright MCP (`.mcp.json`) for page analysis and test execution.
- Browser-engine agnostic design: `browser_engine` setting selects `playwright` (default), `chrome-devtools`, or `stagehand` (Browserbase); `/qa-my-app:init` writes the matching inline `mcpServers` block into the project-scope browser agents. Per-engine setup docs under `docs/browsers/`.
- `SessionStart` + `PostToolUse(Write|Edit|MultiEdit)` hooks running `catalog-diff.mjs` for drift detection.
- `scripts/verify-result.mjs` — schema-rigid validation of runner output (TC table, screenshots, console section, defects).
- `.claude-plugin/marketplace.json` so users can install via `/plugin marketplace add elwizard33/qa-my-app`.
- `LICENSE` (MIT) and `.github/workflows/validate.yml` CI running `claude plugin validate --strict` on every PR.
- 19 `userConfig` knobs (dev URL, parallelism, browser engine, browser channel, headless, settle ms, auth, roles, task depth, exclude globs).

[0.1.0]: https://github.com/elwizard33/qa-my-app/releases/tag/v0.1.0
