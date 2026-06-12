# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **`/qa-catalog:status` — read-only health + inventory snapshot.** Reports browser-agent install state, catalog framework/route/task counts, configured issue trackers, drift vs. source, per-role credential resolution, and the last run's pass/fail/blocked totals. Backed by `scripts/status.mjs` (supports `--json`). Brings the skill count to seven.
- **`/qa-catalog:verify` — change/ticket-scoped inner loop.** Resolves what to test from this conversation + the uncommitted git diff (default), a `--branch [base]` PR range, `--staged`, an explicit route/path, or a connected issue tracker's **acceptance criteria** (`/qa-catalog:verify PROJ-123`). Re-authors only the affected tasks, runs them, and reports pass/fail **per acceptance criterion**. The fast counterpart to the full-suite `/qa-catalog:run-all`.
- `scripts/change-scope.mjs` — maps changed source files onto `catalog.routes[].sourceFile`/`layoutChain` to find the affected routes + tasks. Pure Node + git; modes `--staged`, `--branch [base]`, `--files`.
- `test-author` accepts `settings.acceptanceCriteria` (emits an `## Acceptance criteria` block mapping each criterion to its TCs) and `settings.changedSummary` (biases happy-path/edge cases toward what changed), and now reads the route source directly for exact validation rules.

### Changed
- **The test runner now actually submits.** `qa-test-runner` fills every form/dialog with the task's `Test data` and submits it for real, then asserts the observable result (success toast, new/updated row, error banner) — instead of the previous read-only posture that avoided all state mutation. Only **destructive** actions (delete/remove/destroy) remain gated behind explicit task authorization; the cancel path is always exercised. Results gain an `## Acceptance criteria` table when the task carries criteria.
- `test-author` happy-path template now mandates fill-every-field → submit → assert-concrete-result (and optional reload-to-confirm-persistence); a form on the page always produces a real-submission task, not just a validation task.
- `qa-page-analyzer` emits a `sampleValid`/`sampleInvalid` value per field so authored submissions use realistic data derived from the field's real constraints.

### Added (auth, from earlier in this cycle)
- **Per-role QA credentials.** New `auth_mode: per-role` plus an `auth_credentials_file` setting. `/qa-catalog:init` scaffolds a gitignored `QA-tests/.qa-catalog/auth.local.json` credential map (one login per role; passwords referenced via `${ENV_VAR}`, never written as plaintext) and gitignores `QA-tests/.qa-catalog/state/`.
- `scripts/auth-resolve.mjs` — read-only resolver that interpolates env-var passwords and returns the `credentialsByRole` map (`--json`) or a redacted health report (`--status`). Never writes secrets.
- `qa-test-runner` now reads each task's `Required role`, selects the matching credential, logs in as that role, reports the role used, and BLOCKS (with a `DEF-missing-credential-<role>` defect) when the role's credential is unresolved.
- `qa-page-analyzer` analyzes protected routes as the route's role using the per-role map.
- `test-author` emits an explicit `Required role` metadata field per task and points the sign-in step at the credential map instead of the previously-undocumented `auth.md`.
- `route-discoverer` now traces guards up to two import hops (HOC / middleware / `[Authorize]` / RBAC tables) to infer `rolesAllowed` from backend logic, not just surface patterns.
- `catalog.json` gains a secret-free `auth` block (`mode`, `defaultRole`, `credentialSource`, `rolesUsed`, `rolesConfigured`); `/qa-catalog:status` reports per-role credential resolution health.

## [0.1.0] — initial release

### Added
- Three plugin subagents: `route-discoverer`, `test-author`, `catalog-reconciler`.
- Two project-scope browser subagents (`qa-page-analyzer`, `qa-test-runner`), each spawning its own browser MCP process; installed into `.claude/agents/` by `/qa-catalog:init`.
- Five slash skills: `init`, `scan`, `sync`, `run`, `run-all`.
- `plugin.json` declares an explicit `agents` allowlist so the project-scope browser agents ship in `agents/` purely as copy-templates and are not double-registered as plugin agents.
- Bundled Playwright MCP (`.mcp.json`) for page analysis and test execution.
- Browser-engine agnostic design: `browser_engine` setting selects `playwright` (default), `chrome-devtools`, or `stagehand` (Browserbase); `/qa-catalog:init` writes the matching inline `mcpServers` block into the project-scope browser agents. Per-engine setup docs under `docs/browsers/`.
- `SessionStart` + `PostToolUse(Write|Edit|MultiEdit)` hooks running `catalog-diff.mjs` for drift detection.
- `scripts/verify-result.mjs` — schema-rigid validation of runner output (TC table, screenshots, console section, defects).
- `.claude-plugin/marketplace.json` so users can install via `/plugin marketplace add elwizard33/qa-my-app`.
- `LICENSE` (MIT) and `.github/workflows/validate.yml` CI running `claude plugin validate --strict` on every PR.
- 19 `userConfig` knobs (dev URL, parallelism, browser engine, browser channel, headless, settle ms, auth, roles, task depth, exclude globs).

[0.1.0]: https://github.com/elwizard33/qa-my-app/releases/tag/v0.1.0
