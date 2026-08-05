# QA My App — Plugin Audit Log

> **Single living audit file.** Each audit pass appends a dated section below.
> Finding ids (`F-NNN`) are **stable forever** — once assigned, they never change meaning or get reused. Fixes update the status in the master index; the historical finding stays.

---

## Master findings index

| ID | Severity | Component | Finding | Status | First seen |
|---|---|---|---|---|---|
| [F-001](#f-001) | 🔴 Critical | `.mcp.json` | Missing top-level `mcpServers` wrapper — Playwright MCP would not load | ✅ Fixed (Pass 1) | Pass 1 |
| [F-002](#f-002) | 🟠 High | `plugin.json` | `displayName` did not match product brand ("QA Catalog" → "QA My App") | ✅ Fixed (Pass 1) | Pass 1 |
| [F-003](#f-003) | 🟠 High | `agents/test-runner.md` | `disallowedTools: Write, Edit` blocked runner from writing `result.md` | ✅ Fixed (Pass 2) | Pass 1 |
| [F-004](#f-004) | 🟡 Medium | `hooks/hooks.json` SessionStart | SessionStart fires **before** MCP connect; script must not depend on MCP | ✅ OK | Pass 1 |
| [F-005](#f-005) | 🟡 Medium | `hooks/hooks.json` PostToolUse | `async: true` valid only on `type: command`; matcher regex correct | ✅ OK | Pass 1 |
| [F-006](#f-006) | 🟡 Medium | `skills/*/SKILL.md` | `AskUserQuestion` listed only on skills (main session), never on subagents | ✅ OK | Pass 1 |
| [F-007](#f-007) | 🟡 Medium | `agents/*.md` | No plugin subagent declares banned `hooks` / `mcpServers` / `permissionMode` | ✅ OK | Pass 1 |
| [F-008](#f-008) | 🟡 Medium | `agents/*.md` | All subagents use `model: inherit` | ✅ OK | Pass 1 |
| [F-009](#f-009) | 🟡 Medium | `skills/*/SKILL.md` | All workflow skills set `disable-model-invocation: true` | ✅ OK | Pass 1 |
| [F-010](#f-010) | 🟡 Medium | `skills/*/SKILL.md` | Plugin-namespaced agent ids used (`Agent(qa-my-app:test-runner)` etc.) | ✅ OK | Pass 1 |
| [F-011](#f-011) | 🟢 Low | `plugin.json` `userConfig` | Types limited to `string \| number \| boolean \| directory \| file` | ✅ OK | Pass 1 |
| [F-012](#f-012) | 🟢 Low | `plugin.json` `userConfig` | Sensitive fields marked `sensitive: true` | ✅ OK | Pass 1 |
| [F-013](#f-013) | 🟢 Low | `hooks/hooks.json` | Hook timeouts in **seconds** (not ms) | ✅ OK | Pass 1 |
| [F-014](#f-014) | 🟢 Low | `hooks/hooks.json` | Exec form (`command` + `args` array) used everywhere | ✅ OK | Pass 1 |
| [F-015](#f-015) | 🟢 Low | All scripts | Every script path uses `${CLAUDE_PLUGIN_ROOT}` — no absolute paths | ✅ OK | Pass 1 |
| [F-016](#f-016) | 🟢 Low | `plugin.json` | Marketplace keyword discoverability | ✅ Fixed (Pass 2) | Pass 1 |
| [F-017](#f-017) | 🟢 Low | `agents/*.md` | `tools` / `disallowedTools` interaction semantics verified | ✅ OK | Pass 1 |
| [F-018](#f-018) | 🟢 Low | `agents/*.md` | `effort` and `maxTurns` are documented plugin-agent fields | ✅ OK | Pass 1 |
| [F-019](#f-019) | 🟢 Low | `agents/*.md` | `memory: project` is a valid scope | ✅ OK | Pass 1 |
| [F-020](#f-020) | 🟢 Low | `README.md` | `claude mcp add` examples follow docs option ordering | ✅ OK | Pass 1 |
| [F-021](#f-021) | 🟢 Low | `.mcp.json` | Plugin substitutions (`${CLAUDE_PLUGIN_ROOT}` etc.) available if needed | ✅ OK | Pass 1 |
| [F-022](#f-022) | 🟡 Medium | `skills/*/SKILL.md` | `argument-hint` frontmatter field is valid on plugin slash-command skills | ✅ OK | Pass 2 |
| [F-023](#f-023) | 🟡 Medium | `agents/*.md` | `effort` value is restricted to `low \| medium \| high` — all uses valid | ✅ OK | Pass 2 |
| [F-024](#f-024) | 🟡 Medium | `hooks/hooks.json` | `SessionStart` hook entries correctly omit `matcher` (no tool name to match) | ✅ Superseded by F-043 | Pass 2 |
| [F-025](#f-025) | 🟡 Medium | `agents/page-analyzer.md` | `disallowedTools: Write, Edit` retained intentionally — analyzer only returns JSON, never writes files | ✅ OK by design | Pass 2 |
| [F-026](#f-026) | 🟢 Low | `skills/*/SKILL.md` | Skill name is derived from directory; only `description` is required in frontmatter | ✅ OK | Pass 2 |
| [F-027](#f-027) | 🟢 Low | `plugin.json` | `$schema` points at the published manifest schema — editor IntelliSense works | ✅ OK | Pass 2 |
| [F-028](#f-028) | 🟢 Low | `scripts/verify-result.mjs` | Verification script present and referenced by `run-all` handoff loop | ✅ OK | Pass 2 |
| [F-029](#f-029) | 🟡 Medium | `.claude-plugin/marketplace.json` | No marketplace catalog — users could only install via `--plugin-dir`, not via `/plugin install` from a marketplace | ✅ Fixed (Pass 3) | Pass 3 |
| [F-030](#f-030) | 🟡 Medium | `CHANGELOG.md` | Missing — required entry in Standard plugin layout because `plugin.json` pins an explicit `version` | ✅ Fixed (Pass 3) | Pass 3 |
| [F-031](#f-031) | 🟡 Medium | `LICENSE` | `plugin.json` declares `"license": "MIT"` but no LICENSE file was present at the repo root | ✅ Fixed (Pass 3) | Pass 3 |
| [F-032](#f-032) | 🟢 Low | `.github/workflows/validate.yml` | No CI gate running `claude plugin validate . --strict` on PR | ✅ Fixed (Pass 3) | Pass 3 |
| [F-033](#f-033) | 🟢 Low | `docs/COMPLIANCE.md` | Stale Pass-0 audit file — duplicates `docs/AUDIT.md` and violates the single-file rule | ✅ Fixed (Pass 3) | Pass 3 |
| [F-034](#f-034) | 🟢 Low | `plugin.json` | Pinned `version: "0.2.0"` means users only get updates on bump — documented in CHANGELOG as the intentional release discipline | ✅ OK by design | Pass 3 |
| [F-035](#f-035) | 🟢 Low | `marketplace.json` | `category: "testing"` + discovery keywords on the marketplace entry — places the plugin in the Discover tab under Testing | ✅ OK | Pass 3 |
| [F-036](#f-036) | 🟠 High | `agents/page-analyzer.md`, `agents/test-runner.md` | Both agents instruct Claude to call `mcp__playwright__browser_new_context`, which is absent from the available `@playwright/mcp` tool list — parallel context isolation may silently fail | ✅ Fixed (Pass 4 addendum) | Pass 4 |
| [F-037](#f-037) | 🟡 Medium | `plugin.json` `userConfig` | `available_roles` and `exclude_globs` used a comma-string workaround instead of the idiomatic `multiple: true` array input | ✅ Fixed (Pass 4) | Pass 4 |
| [F-038](#f-038) | 🟢 Low | `plugin.json` | `author` object missing optional `email` and `url` sub-fields documented in the manifest schema | ✅ Fixed (Pass 4) | Pass 4 |
| [F-039](#f-039) | 🟢 Low | `marketplace.json` | `owner` object missing optional `email` sub-field | ✅ Fixed (Pass 4) | Pass 4 |
| [F-040](#f-040) | 🟢 Low | `agents/*.md` | No agent declared a `color` — all five agents are visually indistinguishable in the task panel during parallel runs | ✅ Fixed (Pass 4) | Pass 4 |
| [F-041](#f-041) | 🟢 Low | `skills/*/SKILL.md` | No skill declared `when_to_use` — Claude could not auto-invoke the right skill from trigger phrases | ✅ Fixed (Pass 4) | Pass 4 |
| [F-042](#f-042) | 🟢 Low | `skills/run-all/SKILL.md` | `disallowed-tools: AskUserQuestion` recommended for autonomous run loops | ✅ OK by design — AskUserQuestion needed for interactive route selection in Phase 0 | Pass 4 |
| [F-043](#f-043) | 🟢 Low | `hooks/hooks.json` | `SessionStart` hook lacked `matcher: "startup"` — fired unnecessarily on resume/compact sessions | ✅ Fixed (Pass 4) | Pass 4 |
| [F-044](#f-044) | 🟡 Medium | `skills/init/SKILL.md` | Body instruction still told Claude to spawn `qa-my-app:page-analyzer` — Pass-4 rename leftover; Phase 3 actually dispatches `qa-page-analyzer` | ✅ Fixed (Pass 5) | Pass 5 |
| [F-045](#f-045) | 🟡 Medium | `skills/run-all/SKILL.md` | Two body references to `qa-my-app:test-runner` — `allowed-tools` and dispatch already use the project-scope `qa-test-runner` | ✅ Fixed (Pass 5) | Pass 5 |
| [F-046](#f-046) | 🟡 Medium | `skills/run/SKILL.md` | Frontmatter `description` still said "via the qa-my-app:test-runner subagent" — Pass-4 rename leftover | ✅ Fixed (Pass 5) | Pass 5 |
| [F-047](#f-047) | 🟠 High | `agents/page-analyzer.md`, `agents/test-runner.md` | Both dead plugin-shipped agents still shipped in the package, still referenced the non-existent `mcp__playwright__browser_new_context` tool, and were no longer dispatched by any skill after the Pass-4 split. Confusing for users browsing `agents/`. | ✅ Fixed (Pass 5 — deleted) | Pass 5 |
| [F-048](#f-048) | 🟡 Medium | `agents/qa-page-analyzer.md` | The new project-scope analyzer lost the original plugin agent's `disallowedTools: Write, Edit` guard during the Pass-4 split. The analyzer only returns JSON — writes are out of contract. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-049](#f-049) | 🟢 Low | `skills/init/SKILL.md` | `allowed-tools` granted `Bash(npx *)` but the skill only prints copy-paste commands — never runs npx itself. Over-broad. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-050](#f-050) | 🟡 Medium | `README.md`, `CONTRIBUTING.md` | Subagent table + body still listed `qa-my-app:page-analyzer` / `qa-my-app:test-runner` after the Pass-4 rename to project-scope `qa-page-analyzer` / `qa-test-runner` | ✅ Fixed (Pass 5) | Pass 5 |
| [F-051](#f-051) | 🟠 High | `.github/workflows/validate.yml` | Used floating `actions/checkout@v4` + `actions/setup-node@v4` tags — exploitable on retag attacks. Best-in-class plugins (anthropics, wshobson) pin every action by commit SHA. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-052](#f-052) | 🟢 Low | `.github/workflows/validate.yml` | Checkout did not set `persist-credentials: false` — GITHUB_TOKEN persisted into the working tree. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-053](#f-053) | 🟢 Low | `.github/workflows/validate.yml` | No verification that each `marketplace.json` `source` entry resolves to a real `.claude-plugin/plugin.json`. Added a node step matching the wshobson pattern. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-054](#f-054) | 🟢 Low | repo root | No `CODEOWNERS` — manifest / audit / workflow changes could merge without explicit owner approval. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-055](#f-055) | 🟢 Low | `.github/ISSUE_TEMPLATE/` | No structured issue forms — bug reports landed as freeform issues missing version / framework / repro fields. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-056](#f-056) | 🟢 Low | repo root | No `AGENTS.md` cross-harness conventions file — Anthropic's [memory#agentsmd-interop](https://code.claude.com/docs/en/memory#agentsmd-interop) interop pattern absent. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-057](#f-057) | 🟢 Low | `.claude-plugin/marketplace.json` | Missing `metadata` block + per-plugin `tags` array. flow-next and wshobson both ship the marketplace-level `metadata`. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-058](#f-058) | 🟢 Low | `.claude-plugin/marketplace.json` | Per-plugin `author` object lacked `email` and `url` (those fields existed only on the plugin manifest). Owner record now also has `url`. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-059](#f-059) | 🟢 Low | repo root | `commands/` directory absent. Considered after famous-plugin survey — REJECTED: plugin skills already auto-become `/qa-my-app:*` slash commands per [plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills), so a separate `commands/` would be redundant. | ✅ OK by design (Pass 5) | Pass 5 |
| [F-060](#f-060) | 🟢 Low | `agents/*.md` | `<example>...<commentary>...</example>` blocks in agent descriptions (Anthropic `plugin-validator` pattern). REJECTED: every spawn in this plugin is by-name from skill instructions, never natural-language matched. | ✅ OK by design (Pass 5) | Pass 5 |
| [F-061](#f-061) | 🟢 Low | n/a | `.codex-plugin/plugin.json` parallel manifest for Codex CLI compatibility (flow-next pattern). REJECTED — multi-harness reach not in scope. | ✅ OK by design (Pass 5) | Pass 5 |
| [F-062](#f-062) | 🟢 Low | `skills/*/` | `references/` + `examples/` + `scripts/` subdirectories per skill (Anthropic `plugin-dev` pattern). REJECTED — current `SKILL.md` files fit within Codex's 8KB / Claude's 1,536-char cap. | ✅ OK by design (Pass 5) | Pass 5 |
| [F-063](#f-063) | 🟡 Medium | `hooks/hooks.json` | `asyncRewake` + `rewakeMessage` for background test runs (Anthropic `security-guidance` pattern). DEFERRED — the run-all supervisor already streams results synchronously. | ⚠️ Open (deferred to future pass) | Pass 5 |
| [F-064](#f-064) | 🔴 Critical | `skills/*/SKILL.md` | Pass-4 introduced `when_to_use: Use ... Trigger phrases: "..."` — the colon-space-quote inside an unquoted scalar makes YAML parse `phrases:` as a nested mapping key. Strict validator now rejects every skill; at runtime ALL frontmatter (incl. `disable-model-invocation`, `argument-hint`, `allowed-tools`) is silently dropped. The Pass-4 audit's "Validation passed" claim was wrong. | ✅ Fixed (Pass 5) | Pass 5 |
| [F-065](#f-065) | 🟢 Low | repo root | `CLAUDE.md` at plugin root rejected by validator with warning "not loaded as project context". The CLAUDE.md mechanism only loads from the user's project root, not from a plugin. | ✅ Fixed (Pass 5 — file removed) | Pass 5 |
| [F-066](#f-066) | 🟡 Medium | `hooks/hooks.json`, `scripts/catalog-diff.mjs` | `SessionStart` hook only printed a stderr nudge — it never injected drift info into Claude's session context via the documented `hookSpecificOutput.additionalContext` JSON channel, so Claude wouldn't proactively suggest `/qa-my-app:sync` at session boot. | ✅ Fixed (Pass 6) | Pass 6 |
| [F-067](#f-067) | 🟠 High | `.claude-plugin/marketplace.json` | Plugin entry duplicated `version: "0.2.0"` already declared in `plugin.json`. Per [plugin-marketplaces docs](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution), `plugin.json` always wins silently — a stale duplicate creates an invisible drift trap on every release bump. | ✅ Fixed (Pass 6) | Pass 6 |
| [F-068](#f-068) | 🟡 Medium | `agents/qa-test-runner.md`, `agents/qa-page-analyzer.md` | Project-scope browser agents had no `disallowedTools` denylist. A misbehaving prompt could in principle have them run `git push`, `rm -rf`, `npm publish`, etc. Defense-in-depth on top of existing scope restrictions. | ✅ Fixed (Pass 6) | Pass 6 |
| [F-069](#f-069) | 🟢 Low | `hooks/hooks.json` | Hooks lacked `statusMessage` field — users saw a silent ~10s pause at session boot with no indication what was running. Docs added the field for exactly this UX gap. | ✅ Fixed (Pass 6) | Pass 6 |
| [F-070](#f-070) | 🟢 Low | `hooks/hooks.json` PostToolUse | `if` permission-rule field (added to hooks docs) could narrow PostToolUse to only fire after source-code edits, skipping doc/audit/changelog edits. REJECTED — `if` accepts exactly one rule with no `\|`/`&&` syntax, so per-framework filtering would require 6+ duplicate hook entries; the existing fast-path in `catalog-diff.mjs` (bail when no catalog/fingerprints) already costs <5 ms per no-op edit. | ✅ OK by design (Pass 6) | Pass 6 |
| [F-071](#f-071) | 🟢 Low | `.github/dependabot.yml` | No Dependabot config to auto-bump SHA-pinned GitHub Actions. REJECTED for now — this repo has only 2 pinned actions (`checkout`, `setup-node`); they're upgraded as part of audit passes (F-051), and Dependabot SHA bumps would generate noise PRs the reviewer must SHA-verify anyway. Revisit if action count grows. | ✅ OK by design (Pass 6) | Pass 6 |
| [F-072](#f-072) | 🟢 Low | repo root | `plugin-eval`-style quality framework (wshobson) — multi-criteria scoring with static + LLM-judge + Monte Carlo passes. REJECTED — wshobson runs it across hundreds of subagents in one repo; for a single-plugin repo the value is far below the maintenance cost. Strict-validator + skill/manifest fingerprinting in CI already covers the regression cases. | ✅ OK by design (Pass 6) | Pass 6 |
| [F-073](#f-073) | 🟢 Low | settings | `disableSkillShellExecution: true` enterprise setting blocks `!\`cmd\`` skill substitutions. NOT a plugin-level change — it's a user-controlled `~/.claude/settings.json` flag. Documented here so enterprise integrators know the lever exists; our skills heavily use `!\`...\`` to gather project context, so the setting would disable that context block. | ✅ OK by design (Pass 6) | Pass 6 |
| F-074 | 🔴 Critical | `agents/qa-test-runner.md` | The runner was instructed to **never mutate persistent state** and to only click modal **Cancel** — so authored happy-path "submit valid input → success toast / new row" steps were silently skipped at runtime. A QA tool that never submits a form can't confirm anything works. | ✅ Fixed (Pass 7) | Pass 7 |
| F-075 | 🟠 High | `agents/test-author.md` | Happy-path template stopped at "the form is filled" — it never required an actual submit + concrete observable result, and authored from the analyzer JSON only (never read the route source for the real validation messages/limits). | ✅ Fixed (Pass 7) | Pass 7 |
| F-076 | 🟡 Medium | `agents/qa-page-analyzer.md` | Field inventory captured constraints but no concrete sample values, so authored submissions had to guess valid/invalid data. | ✅ Fixed (Pass 7) | Pass 7 |
| F-077 | 🟠 High | skills, `scripts/` | No change/ticket-scoped workflow — every run was either one task or the whole catalog. No way to "test what I just changed" or "verify this ticket's acceptance criteria." | ✅ Fixed (Pass 7 — new `/qa-my-app:verify` + `change-scope.mjs`) | Pass 7 |

| [F-078](#f-078) | 🔴 Critical | `skills/init`, `skills/run`, `skills/run-all` | `${user_config.auth_password}` was inlined into subagent payloads, but Claude Code never substitutes `sensitive: true` config into skill or agent content — the runner received that literal string, so `auth_mode: shared-credentials` never authenticated. | ✅ Fixed (Pass 8) | Pass 8 |
| [F-079](#f-079) | 🟠 High | `.mcp.json` | Session-level Playwright MCP loaded ~25 browser tool descriptions into every main conversation, while nothing outside the subagents used them. Both browser agents already declare self-contained inline `mcpServers`. Documented anti-pattern. | ✅ Fixed (Pass 8 — file removed) | Pass 8 |
| [F-080](#f-080) | 🟡 Medium | `skills/*/SKILL.md` | All 7 skills set `disable-model-invocation: true`, which suppresses the description entirely — yet each carried a `when_to_use` block of trigger phrases that could therefore never fire. Self-contradictory frontmatter. | ✅ Fixed (Pass 8) | Pass 8 |
| [F-081](#f-081) | 🟡 Medium | `agents/*.md`, docs | Browser MCPs referenced as `@latest`, so each spawn could fetch and execute a different build than the reviewed one — a supply-chain and marketplace-review risk. | ✅ Fixed (Pass 8 — pinned) | Pass 8 |
| [F-082](#f-082) | 🟢 Low | `plugin.json`, repo | Plugin slug `qa-catalog` diverged from the repo/marketplace/docs brand `qa-my-app`. The slug becomes immutable once published to the community catalog, so the split had to be resolved before submission. | ✅ Fixed (Pass 8 — renamed) | Pass 8 |

| [F-083](#f-083) | 🟠 High | `scripts/*.mjs` | Nine deterministic Node helpers with **no behavioural tests** — CI ran `node --check` only, which validates syntax, not behaviour. A regression in `auth-resolve.mjs` (load-bearing for all auth modes as of F-078) or `verify-result.mjs` (the pass/fail gate) would ship silently. | ✅ Fixed (Pass 8 — 46 tests + CI) | Pass 8 |
| [F-084](#f-084) | 🟡 Medium | `.github/` | `CONTRIBUTING.md` step 5 instructed contributors to "fill in the template" for PRs, but no `PULL_REQUEST_TEMPLATE.md` existed. | ✅ Fixed (Pass 8) | Pass 8 |
| [F-085](#f-085) | 🟢 Low | repo root | No `CODE_OF_CONDUCT.md`. `CONTRIBUTING.md` carried a three-line Conduct section, but GitHub's community-health checks and most enterprise review checklists look for the standard file. | ✅ Fixed (Pass 8) | Pass 8 |

**Counts:** 85 findings tracked · 47 fixed · 37 verified compliant / OK by design · 1 deferred (F-063).

---

## Pass 8 — 2026-08-05 — docs-grounded compliance sweep + marketplace submission prep

**Scope:** re-verified every plugin component against the *current* Claude Code documentation (fetched at audit time from `code.claude.com/docs/en/`, which now serves the pages that `docs.claude.com` 301s to), then prepared the plugin for submission to the Anthropic community plugin marketplace. Three of the five findings were live defects, not spec drift.

**Method note.** Two things that looked like bugs were confirmed **correct** and deliberately left alone, recorded here so a future pass doesn't "fix" them:

- `${CLAUDE_PLUGIN_ROOT}` in skill bodies is absent from the skills page's substitution table, but the plugins reference resolves it: for *"Skill and agent content"* placeholders resolve *"Anywhere the placeholder appears."*
- The `plugin.json` `agents` allowlist excluding the two browser agents remains the right workaround for *"plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields."*

### Fixes

- **F-078 (Critical)** — `shared-credentials` auth never worked. [skills/init](../skills/init/SKILL.md), [skills/run](../skills/run/SKILL.md), and [skills/run-all](../skills/run-all/SKILL.md) inlined `${user_config.auth_password}` into the agent payload. Per the [user-configuration docs](https://code.claude.com/docs/en/plugins-reference#user-configuration), only *non-sensitive* values substitute into skill and agent content; sensitive ones reach hook processes alone, as `CLAUDE_PLUGIN_OPTION_<KEY>`. The runner was therefore handed the literal string `${user_config.auth_password}` as the password. All three skills now resolve credentials through [`scripts/auth-resolve.mjs`](../scripts/auth-resolve.mjs) — which already interpolated `${ENV_VAR}` references for `per-role` — and fail loudly when a variable is unset instead of falling back to an empty password. Documented end-to-end in the new [authentication guide](https://elwizard33.github.io/qa-my-app/guides/authentication/).
- **F-079 (High)** — Removed `.mcp.json`. The [sub-agents docs](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent) state it plainly: *"To keep an MCP server out of the main conversation entirely and avoid its tool descriptions consuming context there, define it inline here rather than in `.mcp.json`."* The plugin did both. Verified no skill or script referenced `mcp__playwright` and that both agents use full inline definitions rather than name references, so removal is behaviour-preserving. Directly lowers the **Context cost** figure `/plugin` now displays on every listing.
- **F-080 (Medium)** — Invocation control is now scoped to risk rather than applied blanket. `disable-model-invocation: true` [removes a skill's description from context entirely](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill), so the `when_to_use` trigger phrases on all seven skills were dead weight. `status` (read-only) and `verify` (change-scoped inner loop) now omit the flag; the five that rewrite the catalog or spawn browser runs keep it. Confirmed empirically — before the change, a session with the plugin enabled listed the three `qa-my-app:` agents but zero `qa-my-app:` skills.
- **F-081 (Medium)** — Pinned `@playwright/mcp@0.0.78` and `chrome-devtools-mcp@1.6.0` across the agent templates, the `init` engine-swap blocks, and every doc. Floating `@latest` meant each parallel spawn could `npx`-fetch and execute a build nobody reviewed. Stagehand needs no pin — it's an HTTP MCP, not an npx process.
- **F-082 (Low)** — Renamed the plugin `qa-catalog` → `qa-my-app` across 54 files, aligning slug, namespace, marketplace, repo, and docs site. The `QA-tests/.qa-catalog/` **data directory is deliberately unchanged** so existing catalogs, fingerprints, and `auth.local.json` files survive the upgrade; the rename was applied with that path sentinel-protected. Breaking for installed users (documented reinstall path in the [README](../README.md#install) and [CHANGELOG](../CHANGELOG.md)). Forced now because a plugin's slug is immutable once published to the community catalog.

- **F-083 (High)** — Added a behavioural test suite: **46 tests** across [`tests/`](../tests/) covering `auth-resolve.mjs` (11), `verify-result.mjs` (15), `catalog-diff.mjs` (8), `fingerprint.mjs` (5), and `detect-framework.mjs` (7), wired into CI. Benchmarking prompted this: qa-my-app already exceeds Anthropic's own reference plugins (`example-plugin`, `plugin-dev`) on repo hygiene — those ship only a manifest, LICENSE, README, and component dirs — so docs and process were not the gap. Testing was. Built on the stdlib `node:test` runner to preserve the zero-dependency posture; every script resolves its root from `CLAUDE_PROJECT_DIR`, which makes black-box testing against a temp project tree straightforward. Tests assert on stdout JSON **and exit codes**, since `catalog-diff --precommit`, `auth-resolve`, and `verify-result` all signal through the exit code. **Mutation-checked**: disabling `verify-result`'s PASS-with-failing-TC consistency rule, and making `auth-resolve` ignore missing env vars, each broke exactly one test — confirming the suite has teeth rather than passing vacuously.
- **F-084 (Medium)** — Added [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) with the checks CI enforces plus the two easiest spec violations to make: banned frontmatter fields on plugin-scope agents, and `${user_config.<sensitive_key>}` in skill bodies (the F-078 class of bug).
- **F-085 (Low)** — Added [`CODE_OF_CONDUCT.md`](../CODE_OF_CONDUCT.md) (Contributor Covenant 2.1) with a real reporting address, and a `## Testing` section to `CONTRIBUTING.md`.

### Verification

- `claude plugin validate --strict` passes on both manifests (marketplace and plugin, the latter checked in isolation since the repo root carries both).
- `npm test` → 46/46 passing. `npm run check` → all 9 scripts syntactically valid.
- Confirmed the new root `package.json` (dev-only, `private: true`, zero dependencies) does not affect plugin loading — `claude --plugin-dir .` still registers all 7 skills.
- `node --check` passes on all 9 `scripts/*.mjs`.
- `claude --plugin-dir .` registers all 7 skills under the new namespace — a functional load test, not just schema validation.
- Both CI workflows green on the release commit.

### Marketplace submission notes

The **official** marketplace (`claude-plugins-official`) has no application process — [the docs](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace) state Anthropic curates it at its discretion and *"the submission form does not add plugins to the official marketplace."* The reachable target is the **community** marketplace: submit at `platform.claude.com/plugins/submit` (the Console form; the claude.ai form requires a Team/Enterprise org with directory-management access), which runs the same `plugin validate` check plus automated safety screening. Approved plugins are pinned to a commit SHA in `anthropics/claude-plugins-community`, CI bumps the pin as commits land, and the public catalog syncs **nightly**. Never open a PR against that repo — it's a read-only mirror and PRs auto-close.

Platform support was scoped to **Claude Code only**. Cowork does support hooks, subagents, and local MCP servers, but all 7 skills shell out to `Bash(node *)` and 4 need `Bash(git *)`, against a git checkout with a dev server on localhost — which is not Cowork's surface.

---

## Pass 7 — 2026-06-12 — test-quality audit: make the tests human-like + change-aware

**Scope:** the first audit pass targeting *test quality* rather than plugin-spec compliance (Passes 1–6). Driven by the question "does this plugin actually generate human-like tests that exercise every component and submit real data?" Answer at the start of the pass: **no** — the scaffolding was thorough but the runner was contractually forbidden from submitting anything, so happy-path coverage was theatre.

### Findings + fixes

- **F-074 (Critical)** — Reframed [agents/qa-test-runner.md](../agents/qa-test-runner.md): the runner now fills every form/dialog with the task's `Test data` and **submits for real**, asserting the concrete observable result (toast text, new/updated row, redirect, error banner). The blanket "never mutate persistent state" rule is replaced by a narrow guard on **destructive** actions only (delete/remove/destroy/purge-confirm) — the cancel path is always exercised; confirm-proceed requires explicit task authorization. This protects later tasks' seed data without neutering create/edit verification.
- **F-075 (High)** — [agents/test-author.md](../agents/test-author.md): happy-path template now mandates fill-every-field → click exact submit label → assert concrete result → optional reload-to-confirm-persistence. Any form on a page now yields a real-submission task, not just a validation matrix. The author is also instructed to open the route `sourceFile` (and form-schema file) directly for exact validation messages/limits rather than relying on the analyzer's summary. Added optional `settings.acceptanceCriteria` (emits an `## Acceptance criteria` block mapping each criterion → TCs) and `settings.changedSummary`.
- **F-076 (Medium)** — [agents/qa-page-analyzer.md](../agents/qa-page-analyzer.md): each field now carries a `sampleValid` + `sampleInvalid` value derived from its real constraints, so authored submissions use realistic data.
- **F-077 (High)** — New **`/qa-my-app:verify`** skill ([skills/verify/SKILL.md](../skills/verify/SKILL.md)) + **`scripts/change-scope.mjs`**. Resolves scope from this conversation + uncommitted diff (default), `--branch [base]`, `--staged`, an explicit route/path, or a connected issue tracker's acceptance criteria (`verify PROJ-123`). Re-authors only the affected tasks and runs them via the existing `run-all` dispatch/verify loop, reporting pass/fail per acceptance criterion. The runner gains an `## Acceptance criteria` results table.

### Deliberately NOT done (per user steer mid-pass)

The initial audit recommended a **backend-contract analysis** stage (read API handlers/DB schema to derive server-side edge cases) and a **fixtures/seed/teardown** lifecycle. The user scoped this explicitly to **frontend** behavior: fill forms, submit, observe UI results/errors. No backend code-reading for edge cases, no DB seeding/cleanup machinery was added — edge cases are derived from the form's own (frontend) validation rules, which is what a human manual tester actually exercises. Re-evaluate backend-derived edge cases only if requested.

### Validation

`npx -y @anthropic-ai/claude-code plugin validate . --strict` → ✔ passed. `node --check scripts/change-scope.mjs` → clean; smoke-run returns `noCatalog:true` outside a catalog'd project as designed.

---

## Pass 5 — 2026-05-28 (late night) — enterprise hardening + popular-plugin deep dive

**Re-audit against the latest Claude Code documentation AND a second, deeper survey of the most-installed community plugins** (`anthropics/claude-code` bundled plugins, `wshobson/agents`, `wshobson/commands`, `gmickel/flow-next`, `ComposioHQ/awesome-claude-plugins`, `SuperClaude-Org/SuperClaude_Framework`). Goal: take the plugin from "passes strict validation" to "matches the operational and supply-chain posture of the top community plugins."

### Critical regression discovered + fixed

The Pass-4 audit reported `claude plugin validate . --strict` passed. **It did not.** Running the current validator against the working tree at the start of Pass 5 surfaced:

- 5/5 skills failing YAML frontmatter parse: `when_to_use: Use ... Trigger phrases: "set up QA", ...` — the colon-space-quote inside an unquoted scalar value makes the YAML parser interpret `phrases:` as a nested mapping key (`mapping values are not allowed here`). At runtime every skill loads with empty metadata: `disable-model-invocation`, `argument-hint`, `allowed-tools`, and `description` are all silently dropped. The skills still load and run, but their tool-allowlist guardrails are gone — Claude could spawn any agent, run any Bash, and auto-trigger from natural-language matches.
- Plugin-root `CLAUDE.md` rejected with a warning ("not loaded as project context. To ship context with your plugin, use a skill instead").

Fix:
- All 5 `when_to_use:` values converted to YAML literal block scalars (`|`) and rephrased to use "Trigger phrases include …" instead of "Trigger phrases: \"…\"". Both make the YAML parser-safe AND preserve the trigger-phrase content.
- `CLAUDE.md` deleted; conventions moved to [`AGENTS.md`](../AGENTS.md), which is human-readable contributor doc, not load-bearing harness state.

### Doc-driven findings (Claude Code docs re-fetched in full)

The docs audit found capabilities the plugin had not yet adopted that are NOT covered by Pass 1–4. We picked the ones with real ROI:

| Capability | Docs section | Status before Pass 5 | Action |
|---|---|---|---|
| Plugin-root `CLAUDE.md` is **not** loaded | plugin manifest validator warning | n/a | Removed (F-065) |
| Skills auto-become `/qa-my-app:*` slash commands | [plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills) | Already true | No separate `commands/` dir needed (F-059) |
| `paths` glob on skills | [skills → Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference) | Not used | Not applicable — skills are user-invocable, not auto-injected |
| `arguments` named positional args | same | Not used | Skip — `$ARGUMENTS` raw is sufficient for our single-arg skills |
| Subagent `skills:` preload field | [sub-agents → Supported frontmatter](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields) | Not used | Skip — agents read instructions from the spawn payload, not from preloaded skills |
| `effort: xhigh` / `max` levels | same | Using `high` | Skip — `high` is the right tier for the agents that use it |
| `isolation: "worktree"` on subagents | same | Not used | Skip — our runners already isolate via unique `runDir`; worktrees would cost 200–500 ms + disk per spawn |
| `experimental.themes` / `experimental.monitors` / agent-teams | various | Not used | Skip — experimental |
| `bin/` directory | [plugins-reference → Bin scripts](https://code.claude.com/docs/en/plugins-reference) | Not used | Skip — same rationale as Pass 3 |

### Famous-plugin survey baseline — what we ALSO weren't shipping

Second deep survey across `anthropics/claude-code` bundled plugins (13), `wshobson/agents`, `flow-next`, `composio awesome list`, `SuperClaude`. We harvested 20 "differentiated" patterns; adopted 8, rejected/deferred 12 with explicit rationale.

| Pattern | Where seen | Status before Pass 5 | Action |
|---|---|---|---|
| GitHub Actions pinned by commit SHA | anthropics, wshobson | Floating `@v4` tags | ✅ Adopted (F-051) |
| `persist-credentials: false` on checkout | wshobson | Default permissive | ✅ Adopted (F-052) |
| Marketplace-source resolution in CI | wshobson | Not present | ✅ Adopted (F-053) |
| `CODEOWNERS` | SuperClaude, anthropics | Not present | ✅ Adopted (F-054) |
| `.github/ISSUE_TEMPLATE/` structured YAML forms | anthropics | Freeform issues | ✅ Adopted (F-055) |
| `AGENTS.md` + cross-harness convention | wshobson, SuperClaude | Not present | ✅ Adopted (F-056) |
| Marketplace `metadata` block + per-plugin `tags` | flow-next, wshobson | Not present | ✅ Adopted (F-057) |
| Per-plugin `author.email`/`url` in marketplace.json | wshobson | Plugin-only | ✅ Adopted (F-058) |
| Separate `commands/` dir | every top plugin | Not present | ❌ Rejected (F-059) — skills already become commands |
| `<example>...<commentary>` in agent descriptions | anthropics `plugin-validator` | Not present | ❌ Rejected (F-060) — every spawn is by-name, not description-matched |
| `.codex-plugin/plugin.json` parallel manifest | flow-next | Not present | ❌ Rejected (F-061) — Codex CLI out of scope |
| `skills/<name>/references/`+`examples/`+`scripts/` | anthropics `plugin-dev` | Not present | ❌ Rejected (F-062) — current sizes fit |
| `asyncRewake` hooks | anthropics `security-guidance` | Not present | ⚠️ Deferred (F-063) — supervisor pattern already serves the same need |
| `markdownlint-cli2` workflow | wshobson | Not present | Skip — overkill for one plugin |
| Cross-OS test matrix | flow-next | Not present | Skip — strict-validate already runs on Ubuntu and all our scripts are pure Node |
| Multi-language READMEs | SuperClaude | Not present | Skip — no demand |
| `CODE_OF_CONDUCT.md` | SuperClaude, anthropics | Not present | Skip — CONTRIBUTING.md covers contribution norms |
| `templates/` dir | flow-next | Not present | Skip — inline heredoc templates are short enough |
| Tag-driven GitHub Release workflow | flow-next | Not present | Skip for now — `claude plugin tag` CLI covers releases |
| `anthropics/claude-code-action@v1` PR-review bot | wshobson | Not present | Skip — not requested by users yet |

### Changes applied this pass

**Critical (production blocker):**
- **F-064** — Fixed YAML frontmatter parse failure in all 5 skills. Every `when_to_use:` value is now a YAML literal block scalar (`|`) and the inner `Trigger phrases: "…"` pattern was rephrased to `Trigger phrases include "…"`. Strict validation now passes both manifests end-clean.
- **F-065** — Deleted plugin-root `CLAUDE.md` (validator rejected it).

**Pass-4 rename leftovers (production-impact):**
- **F-044** — Updated [skills/init/SKILL.md](../skills/init/SKILL.md) line 36 instruction to use the project-scope `qa-page-analyzer` name (not `qa-my-app:page-analyzer`).
- **F-045** — Updated [skills/run-all/SKILL.md](../skills/run-all/SKILL.md) body lines (33, 225) to reference `qa-test-runner` (project-scope), matching the `allowed-tools` declaration.
- **F-046** — Rewrote [skills/run/SKILL.md](../skills/run/SKILL.md) frontmatter `description` to reference `qa-test-runner` instead of the stale `qa-my-app:test-runner`. Also updated the in-skill link to [agents/qa-test-runner.md](../agents/qa-test-runner.md).
- **F-047** — Deleted `agents/page-analyzer.md` and `agents/test-runner.md`. These plugin-shipped agents still referenced the non-existent `mcp__playwright__browser_new_context` tool and were no longer dispatched by any skill after the Pass-4 split. Their continued presence in `agents/` confused readers about which agents are active.
- **F-048** — Added `disallowedTools: Write, Edit, MultiEdit` to [agents/qa-page-analyzer.md](../agents/qa-page-analyzer.md). The Pass-4 split lost the original guard; analyzers return JSON only.
- **F-049** — Removed unused `Bash(npx *)` from [skills/init/SKILL.md](../skills/init/SKILL.md) `allowed-tools`. The skill only prints copy-paste commands.
- **F-050** — Synced [README.md](../README.md) subagent table + body text and [CONTRIBUTING.md](../CONTRIBUTING.md) layout section with the post-rename reality. The subagent table now distinguishes plugin-scope (`qa-my-app:*`) from project-scope (`qa-page-analyzer`, `qa-test-runner`) and explains the inline-`mcpServers` rationale.

**Supply-chain & governance (CI workflow + repo files):**
- **F-051** — Pinned actions in [.github/workflows/validate.yml](../.github/workflows/validate.yml) by commit SHA with `# version` comments: `actions/checkout@de0fac2…` (v6.0.2) and `actions/setup-node@48b55a01…` (v6.4.0). Resolved live from the action repositories via `gh api`. Mitigates retag attacks per GitHub's [security hardening guide](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- **F-052** — Added `with: persist-credentials: false` on the checkout step. The `GITHUB_TOKEN` is no longer written into `.git/config` of the working tree.
- **F-053** — Added a CI step that verifies each `marketplace.json` plugins[].source string resolves to a real `.claude-plugin/plugin.json` on disk. Mirrors the wshobson pattern. Catches the failure mode where a `source` was renamed or moved without updating the marketplace entry.
- **F-054** — Added [.github/CODEOWNERS](../.github/CODEOWNERS). Default owner is `@elwizard33`; manifest, audit log, workflow files, and the two project-scope agents have explicit owner-required reviews. Auto-assigns reviewers on PR.
- **F-055** — Added structured issue forms: [.github/ISSUE_TEMPLATE/bug_report.yml](../.github/ISSUE_TEMPLATE/bug_report.yml) (required fields: Claude Code version, plugin version, OS, framework, which skill, repro, expected, actual + post-submit checklist), [feature_request.yml](../.github/ISSUE_TEMPLATE/feature_request.yml), and [config.yml](../.github/ISSUE_TEMPLATE/config.yml) (blank issues disabled, GitHub Security Advisory link for vulnerability disclosure).

**Cross-harness convention + marketplace polish:**
- **F-056** — Added [AGENTS.md](../AGENTS.md) at repo root following the [Anthropic memory#agentsmd-interop](https://code.claude.com/docs/en/memory#agentsmd-interop) convention. Documents repo identity, component layout, the 10 hard rules, agent selection convention, color coding, "where to look first" cheatsheet, and don'ts. Plain Markdown — works for Claude Code, Codex CLI, and human contributors equally.
- **F-057** — Added `metadata: { description, version }` block to [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json) (marketplace-level analog of the per-plugin block; visible in marketplace listing UIs). Added per-plugin `tags: ["qa", "e2e", "playwright", "regression", "screenshot-testing"]` distinct from `keywords` — `tags` are the marketplace's curated discovery facet, `keywords` are free-text index entries.
- **F-058** — Enriched per-plugin `author` in marketplace.json with `email` and `url` (was previously name-only despite the same data being present in plugin.json). Added `url` to the marketplace `owner` block.

**Considered + explicitly rejected (with reasoning preserved):**
- **F-059** — A `commands/` directory mirroring skills as user-typeable slash commands. **Rejected**: plugin skills already auto-become `/qa-my-app:*` per [plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills). Adding `commands/` would either shadow or duplicate the auto-mapped paths.
- **F-060** — `<example>...<commentary>...</example>` blocks inside agent descriptions (the Anthropic `plugin-validator` pattern that boosts natural-language agent selection). **Rejected**: every spawn in this plugin is by-name from skill instructions (`Agent(qa-my-app:test-author)` etc.). Description-matched auto-selection never fires for these agents.
- **F-061** — `.codex-plugin/plugin.json` parallel manifest (flow-next's Codex CLI interop pattern). **Rejected**: Codex CLI support is not in scope. Re-evaluate if and when users request it.
- **F-062** — `skills/<name>/references/` + `examples/` + `scripts/` subdirectories (Anthropic `plugin-dev` pattern). **Rejected**: current `SKILL.md` files are within 5–10 KB, well under both Codex's 8 KB SKILL.md cap and Claude's 1,536-character skill-listing description cap. Reorganize only if a skill grows past these thresholds.
- **F-063** — `asyncRewake` + `rewakeMessage` hooks for background test runs (Anthropic `security-guidance` pattern). **Deferred**: would let `/qa-my-app:run-all` fire-and-forget while results stream back into the conversation when complete. The current supervisor pattern (synchronous dispatch-verify-update loop) already provides this UX inside one turn. Worth revisiting if users ask for "kick off the test run and come back to it later".

### Validation

```powershell
npx -y @anthropic-ai/claude-code plugin validate . --strict
npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict
```

Both manifests end-clean. `node --check` on every `.mjs` helper passes. Pass-4's previously-incorrect "validation passed" claim is now genuinely true post-F-064.

---

## Pass 4 — 2026-05-28 (night) — deep docs + popular-plugin cross-reference

**Full re-audit against the current Claude Code documentation AND a live browser survey of the top community plugins.** Every doc page was re-scraped this pass; the Pass 3 claims about Pass 1–3 findings were re-verified against current content.

**Survey baseline — what the docs expose that we had not yet adopted:**

| Capability | Docs section | QA My App (before Pass 4) |
|---|---|---|
| `author.email` / `author.url` in plugin.json | plugins-reference → Metadata fields | ❌ Missing |
| `owner.email` in marketplace.json | plugin-marketplaces → Owner fields | ❌ Missing |
| `multiple: true` on array-valued `userConfig` fields | plugins-reference → User configuration | ❌ Comma-string workaround |
| `color` on agent files | sub-agents → Supported frontmatter fields | ❌ All 5 agents identical in task panel |
| `when_to_use` on skill files | skills → Frontmatter reference | ❌ No skill declared it |
| `matcher: "startup"` on `SessionStart` hook | hooks → Matcher patterns | ❌ Fired on every session start including resume/compact |
| `mcp__playwright__browser_new_context` tool actually present | @playwright/mcp tool list | ⚠️ Not in available tool list — isolation strategy unverified |

**Changes applied this pass:**

- **F-037** — Changed `available_roles` and `exclude_globs` in [.claude-plugin/plugin.json](../.claude-plugin/plugin.json) from comma-string fields to proper array inputs using `multiple: true`. Updated descriptions to drop the "Comma-separated" instruction. The plugin's init and sync skills already split by comma in their body instructions; those comments become moot for new installations but do not break existing ones since the template substitution of an array naturally produces comma-separated text.

- **F-038** — Added `"email": "elwizard33@users.noreply.github.com"` and `"url": "https://github.com/elwizard33"` to the `author` object in [.claude-plugin/plugin.json](../.claude-plugin/plugin.json). These optional fields appear in the `/plugin` picker and improve attribution for enterprise installs where legal requires maintainer contact.

- **F-039** — Added `"email": "elwizard33@users.noreply.github.com"` to the `owner` object in [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json). Completes the owner record expected by marketplace distribution tooling.

- **F-040** — Added a distinct `color` to each of the five agent files: `page-analyzer` → **blue**, `route-discoverer` → **green**, `test-author` → **yellow**, `test-runner` → **orange**, `catalog-reconciler` → **purple**. With up to 12 parallel agents running simultaneously during a `/qa-my-app:run-all`, color differentiation in the task panel is the only way for the user to track which type of agent each progress row represents.

- **F-041** — Added `when_to_use` to all five skills ([init](../skills/init/SKILL.md), [scan](../skills/scan/SKILL.md), [sync](../skills/sync/SKILL.md), [run](../skills/run/SKILL.md), [run-all](../skills/run-all/SKILL.md)). The field tells Claude which natural-language trigger phrases should auto-invoke each skill. Without it, Claude falls back to matching only the `description` text, which is less precise and can fail to activate the right skill.

- **F-043** — Added `"matcher": "startup"` to the `SessionStart` entry in [hooks/hooks.json](../hooks/hooks.json). The `SessionStart` event fires on `startup`, `resume`, `clear`, and `compact`. The catalog-diff script is only useful on fresh session starts — running it on resume (where the catalog was already checked) or on compact (context compression) wastes 15 s of startup latency for no signal. The `startup` matcher restricts the hook to new sessions only.

**New finding logged, not yet fixed:**

- **F-036** — Both `page-analyzer` and `test-runner` agents instruct Claude to call `mcp__playwright__browser_new_context` to open isolated browser contexts for parallel runs. Live inspection of the `@playwright/mcp` tool list reveals **no `browser_new_context` tool**. Available tools are: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill_form`, `browser_type`, `browser_press_key`, `browser_select_option`, `browser_hover`, `browser_drag`, `browser_drop`, `browser_evaluate`, `browser_run_code_unsafe`, `browser_wait_for`, `browser_take_screenshot`, `browser_tabs`, `browser_resize`, `browser_close`, `browser_navigate_back`, `browser_network_request`, `browser_network_requests`, `browser_console_messages`, `browser_handle_dialog`, `browser_file_upload`. If `browser_new_context` does not exist, parallel runners will **all share the single default browser context** — cookies, localStorage, and navigation state will bleed across agents, making parallel runs non-deterministic and potentially invalid. **Action required before production use:** verify whether a newer `@playwright/mcp` version exposes `browser_new_context`, or rewrite the isolation strategy to use separate `contextId`-scoped tab groups via `browser_tabs`.

**Rejected (evaluated and not adopted):**

- **`disallowed-tools: AskUserQuestion` on run-all** (F-042) — the skill intentionally uses `AskUserQuestion` once in Phase 0 to let the user pick which routes to test when no filter argument is provided. Adding `disallowed-tools` would break the interactive no-args invocation. The autonomous-loop pattern is already enforced by the skill's own phase logic. ✅ OK by design.
- **`background: true` on test-runner / page-analyzer** — run-all and init already dispatch agents in explicit parallel batches; marking agents `background: true` would produce duplicate progress reporting. No benefit.
- **`isolation: "worktree"` on test-runner** — each runner already writes to a unique `runDir/<taskId>/` path so filesystem isolation is guaranteed by directory naming, not by git worktrees. The worktree overhead (~200–500 ms + disk per agent, per the Workflow docs) is not justified.
- **`experimental.monitors`** — still experimental in current docs. Avoided in a release plugin.
- **`bin/` directory** — scripts are invoked via `node ${CLAUDE_PLUGIN_ROOT}/scripts/...`; promoting them to `bin/` would add indirection with no functional gain.
- **`settings.json` at plugin root** — no need to override the user's default agent; the skills are explicit entry points.

**Validation:** `npx -y @anthropic-ai/claude-code plugin validate . --strict` — ✔ passed.

---

## Pass 3 — 2026-05-28 (evening) — enterprise polish

**Re-audit against the latest Claude Code docs *and* a survey of the most-installed community plugins** ([anthropics/claude-code/plugins](https://github.com/anthropics/claude-code/tree/main/plugins), [gmickel/flow-next](https://github.com/gmickel/flow-next), [ComposioHQ/awesome-claude-plugins](https://github.com/ComposioHQ/awesome-claude-plugins)). Goal: raise this plugin to the same shipping-quality bar as the official bundled plugins.

**Survey baseline — what every top-tier plugin ships that we previously didn't:**

| Artifact | Anthropic bundled | flow-next | composio awesome list | QA My App (before Pass 3) |
|---|---|---|---|---|
| `.claude-plugin/marketplace.json` | ✅ | ✅ | ✅ | ❌ |
| `LICENSE` at root | ✅ | ✅ | ✅ | ❌ (plugin.json claimed MIT only) |
| `CHANGELOG.md` | ✅ | ✅ | n/a | ❌ |
| CI `claude plugin validate --strict` | ✅ | ✅ | ✅ | ❌ |
| `category` on marketplace entry | ✅ | n/a | ✅ | ❌ |
| `$schema` on manifest + marketplace | ✅ | ✅ | ✅ | partial (plugin.json only) |

**Changes applied this pass:**

- **F-029** — Added [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json) — single-plugin self-marketplace. Users can now run `/plugin marketplace add elwizard33/qa-my-app` followed by `/plugin install qa-my-app@qa-my-app` instead of cloning + `--plugin-dir`. Carries `$schema`, `owner`, `category: "testing"`, and the same `keywords` block as `plugin.json`.
- **F-030** — Added [CHANGELOG.md](../CHANGELOG.md) at repo root. Keep-a-Changelog format. Documents 0.1.0 → 0.2.0 (Pass 1+2 fixes) and the Unreleased Pass 3 additions. Required because `plugin.json` pins an explicit `version` — per [plugin-marketplaces docs](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution), pinned plugins only update on bump, so the bump cadence must be visible to users.
- **F-031** — Added [LICENSE](../LICENSE) (MIT) at repo root matching the `plugin.json` `license` declaration. Anthropic's bundled plugins, flow-next, and the composio list all ship a LICENSE file; lawyers will refuse to install a plugin whose license is asserted but not present.
- **F-032** — Added [.github/workflows/validate.yml](../.github/workflows/validate.yml). Runs `npx -y @anthropic-ai/claude-code plugin validate . --strict` on every push + PR + manual dispatch, plus `node --check` on every `.mjs` helper script. Mirrors the CI gate on anthropic/claude-code itself.
- **F-033** — Deleted `docs/COMPLIANCE.md`. It was a stale Pass-0 artifact that duplicated the master index and violated the single-living-file rule established in Pass 2.

**New findings logged + verified compliant without code change:** F-034 (pinned version discipline — documented in CHANGELOG), F-035 (marketplace category + keywords applied).

**Not adopted (rejected after evaluation):**

- **`settings.json` with `subagentStatusLine`** — flow-next and plugin-dev set this; we don't need it because our `run-all` skill already streams per-task results back via the supervisor. Adding a status-line plugin-wide would conflict with users' own `subagentStatusLine` setting.
- **`bin/` directory** — no binaries to expose. All `.mjs` helpers are invoked via `node ${CLAUDE_PLUGIN_ROOT}/scripts/...` from hooks/skills; promoting them to `bin/` would just add an indirection.
- **`experimental.monitors`** — experimental field. Avoid in a release plugin until it leaves experimental.
- **`SubagentStop` hook** — runner already writes a deterministic `result.md` per task and the supervisor verifies them in-loop; a `SubagentStop` hook would be redundant.
- **Restructure to `plugins/qa-my-app/` subfolder** (anthropic / flow-next layout) — breaking change for every existing `--plugin-dir` user and every hook path. The single-plugin-at-root + `"source": "./"` marketplace pattern is explicitly allowed by [plugin-marketplaces → Source field](https://code.claude.com/docs/en/plugin-marketplaces#source-field).

**Validation:** `npx -y @anthropic-ai/claude-code plugin validate . --strict` → see closing line below.

---

## Pass 2 — 2026-05-28 (afternoon)

**Re-audit and implementation pass.** Goals:
1. Apply the open recommendations from Pass 1 (F-003 design decision, F-016 cosmetic keywords).
2. Re-check the plugin against the same 6 doc pages for anything missed.
3. Consolidate the audit log into a single living file.

**Changes applied this pass:**

- **F-003** — Dropped `disallowedTools: Write, Edit` from [agents/test-runner.md](../agents/test-runner.md). Rationale: per [plugins-reference → Agents](https://code.claude.com/docs/en/plugins-reference#agents), `hooks` cannot be declared on plugin-shipped subagents, so a scoped `PreToolUse` block is impossible. Trusting the system prompt + `scripts/verify-result.mjs` at the handoff boundary is simpler than smuggling `result.md` through `Bash` heredocs.
- **F-016** — Expanded `plugin.json` `keywords` to `["qa", "testing", "playwright", "claude-code", "claude-code-plugin", "e2e", "qa-automation", "regression-testing", "test-generation", "route-discovery"]`.

**New findings discovered this pass:** F-022, F-023, F-024, F-025, F-026, F-027, F-028 — all verified compliant; none required changes.

**Validation:** `npx -y @anthropic-ai/claude-code plugin validate . --strict` → ✔ Validation passed.

---

## Pass 1 — 2026-05-28 (morning)

**Initial comprehensive audit** against:
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugins
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/mcp

**Changes applied this pass:**

- **F-001** — Wrapped `.mcp.json` server entries in the required top-level `mcpServers` object. Without this, Playwright MCP would have silently failed to load.
- **F-002** — Set `plugin.json` `displayName` to "QA My App"; rewrote description to lead with end-to-end QA.

**Findings logged:** F-001 through F-021. 17 verified compliant, 2 fixed in-pass, 2 left open (F-003 design decision, F-016 cosmetic). Both were closed in Pass 2.

**Validation:** ✔ Validation passed after fixes.

---

## Detailed findings

> Each finding cites the docs URL it was checked against so future passes can re-verify against newer documentation.

### F-001 — `.mcp.json` missing top-level `mcpServers` wrapper {#f-001}

**Severity:** 🔴 Critical · **Status:** ✅ Fixed (Pass 1)

**Source of truth:** [Plugins reference → MCP servers](https://code.claude.com/docs/en/plugins-reference#mcp-servers), [MCP → Plugin-provided MCP servers](https://code.claude.com/docs/en/mcp#plugin-provided-mcp-servers). Canonical shape: `{ "mcpServers": { "<name>": { ... } } }`.

**Defect:** the server key (`"playwright"`) was at the top level. Claude Code would treat the file as malformed and silently skip the server — `page-analyzer` and `test-runner` would have no browser tools.

**Fix:** wrapped in `mcpServers`. See [.mcp.json](../.mcp.json).

---

### F-002 — `plugin.json` `displayName` mismatch {#f-002}

**Severity:** 🟠 High · **Status:** ✅ Fixed (Pass 1)

`displayName` is the human-visible label per [plugins-reference → Metadata fields](https://code.claude.com/docs/en/plugins-reference#metadata-fields). It was "QA Catalog" — the product brand is "QA My App".

**Fix:** `displayName` → `"QA My App"`. Internal `name: "qa-my-app"` kept so namespaced references (`Agent(qa-my-app:test-runner)`, `/qa-my-app:init`) don't break.

---

### F-003 — Runner could not directly write `result.md` {#f-003}

**Severity:** 🟠 High · **Status:** ✅ Fixed (Pass 2)

**Source of truth:** [sub-agents → Available tools](https://code.claude.com/docs/en/sub-agents#available-tools), [plugins-reference → Agents](https://code.claude.com/docs/en/plugins-reference#agents).

The runner declared `disallowedTools: Write, Edit`, forcing `result.md` writes through `Bash` heredoc. The cleaner alternative — a scoped `PreToolUse` hook on the agent — is impossible because `hooks` is banned on plugin-shipped agents.

**Fix (Pass 2):** dropped `disallowedTools` from [agents/test-runner.md](../agents/test-runner.md). The supervisor still validates every returned `result.md` via `scripts/verify-result.mjs`, catching misuse at the handoff boundary.

---

### F-004 — `SessionStart` hook fires before MCP connect {#f-004}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Per [hooks → MCP tool hook fields](https://code.claude.com/docs/en/hooks#mcp-tool-hook-fields), SessionStart and Setup fire before servers finish connecting. Our hook runs `scripts/catalog-diff.mjs` — pure Node, no MCP calls. ✓

---

### F-005 — PostToolUse async + matcher {#f-005}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

`async: true` is valid only on `type: command` hooks per [hooks → Configure an async hook](https://code.claude.com/docs/en/hooks#configure-an-async-hook). Matcher `Write|Edit|MultiEdit` is a regex against `tool_name`. ✓

---

### F-006 — `AskUserQuestion` scoping {#f-006}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Per [sub-agents → Available tools](https://code.claude.com/docs/en/sub-agents#available-tools), `AskUserQuestion` is **not** available to subagents. Listed only on skills (which run in the main session). No `agents/*.md` lists it. ✓

---

### F-007 — Banned plugin-agent frontmatter fields {#f-007}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Per [plugins-reference → Agents](https://code.claude.com/docs/en/plugins-reference#agents): plugin-shipped agents cannot declare `hooks`, `mcpServers`, or `permissionMode`. Verified across all five agents. ✓

---

### F-008 — `model: inherit` everywhere {#f-008}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Aligns with the user memory rule "never hardcode model names". ✓

---

### F-009 — `disable-model-invocation: true` on workflow skills {#f-009}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Per [skills → Control who invokes a skill](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill). All five skills set it. ✓

---

### F-010 — Plugin-namespaced agent ids {#f-010}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 1)

Skills reference agents as `Agent(qa-my-app:<name>)` per [sub-agents → Plugin subagents](https://code.claude.com/docs/en/sub-agents#choose-the-subagent-scope). ✓

---

### F-011 — userConfig types {#f-011}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Only `string | number | boolean | file` used; all valid per [plugins-reference → User configuration](https://code.claude.com/docs/en/plugins-reference#user-configuration).

---

### F-012 — Sensitive userConfig fields {#f-012}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

`auth_password` is `"sensitive": true` — stored in OS keychain, exposed via `CLAUDE_PLUGIN_OPTION_<KEY>`, never substituted into rendered prompts.

---

### F-013 — Hook timeouts in seconds {#f-013}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Values `15` (SessionStart) and `10` (PostToolUse) are seconds per [hooks → Common fields](https://code.claude.com/docs/en/hooks#common-fields). ✓

---

### F-014 — Exec form for hook commands {#f-014}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Per [plugins-reference → Environment variables](https://code.claude.com/docs/en/plugins-reference#environment-variables): exec form (`command + args` array) is required so `${CLAUDE_PLUGIN_ROOT}` is passed as one argument with no quoting. ✓

---

### F-015 — Path portability {#f-015}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Every script reference uses `${CLAUDE_PLUGIN_ROOT}`. No absolute paths. ✓

---

### F-016 — Marketplace discoverability {#f-016}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 2)

Keywords expanded to include `claude-code-plugin`, `e2e`, `qa-automation`, `regression-testing` for marketplace index coverage.

---

### F-017 — `tools` allowlist semantics {#f-017}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Per docs: if both `tools` and `disallowedTools` are set, `disallowedTools` is applied first. No agent sets both. ✓

---

### F-018 — `effort` and `maxTurns` on subagents {#f-018}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Both fields are documented plugin-agent frontmatter per [plugins-reference → Agents](https://code.claude.com/docs/en/plugins-reference#agents). ✓

---

### F-019 — `memory: project` scope {#f-019}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Per [sub-agents → Enable persistent memory](https://code.claude.com/docs/en/sub-agents#enable-persistent-memory). ✓

---

### F-020 — MCP install commands in README {#f-020}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

Options (`--transport`, `--scope`, `--header`, `--env`) precede the server name; `--` separates stdio command. Cross-checked against [MCP → Installing MCP servers](https://code.claude.com/docs/en/mcp#installing-mcp-servers). ✓

---

### F-021 — Plugin MCP substitutions {#f-021}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 1)

`${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`, `${CLAUDE_PROJECT_DIR}`, `${user_config.*}` available in `.mcp.json` if later needed. ✓

---

### F-022 — `argument-hint` on plugin slash-command skills {#f-022}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 2)

Skills `init`, `run`, and `run-all` use `argument-hint`. Per [plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills), plugin skills become slash commands and inherit slash-command frontmatter fields including `argument-hint`. ✓

---

### F-023 — `effort` value range {#f-023}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 2)

[plugins-reference → Agents](https://code.claude.com/docs/en/plugins-reference#agents) restricts `effort` to `low | medium | high`. `page-analyzer` and `test-runner` use `high`. ✓

---

### F-024 — `SessionStart` matcher correctly omitted {#f-024}

**Severity:** 🟡 Medium · **Status:** ✅ OK (Pass 2)

`SessionStart` has no tool name to match. Per [hooks → Configuration](https://code.claude.com/docs/en/hooks), `matcher` is only meaningful for tool-related events (`PreToolUse`, `PostToolUse`). Our `SessionStart` entry omits `matcher`; our `PostToolUse` entry includes it. ✓

---

### F-025 — `page-analyzer` retains `disallowedTools: Write, Edit` by design {#f-025}

**Severity:** 🟡 Medium · **Status:** ✅ OK by design (Pass 2)

Unlike `test-runner` (F-003), `page-analyzer` returns only a JSON object to the supervisor — it never writes files. The restriction reinforces its role at zero cost. No change. ✓

---

### F-026 — Skill name is implicit {#f-026}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 2)

[plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills) and [skills](https://code.claude.com/docs/en/skills) derive the skill name from the directory. Only `description` is required in frontmatter. All five skills omit `name:` — correct. ✓

---

### F-027 — `$schema` reference {#f-027}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 2)

`plugin.json` points `$schema` at `https://json.schemastore.org/claude-code-plugin-manifest.json`, giving editors IntelliSense + validation without affecting runtime. ✓

---

### F-028 — `verify-result.mjs` referenced by run-all handoff loop {#f-028}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 2)

`scripts/verify-result.mjs` exists and is invoked via the `Bash(node *)` permission in [skills/run-all/SKILL.md](../skills/run-all/SKILL.md). The handoff loop (Pass 1 design) is wired end-to-end. ✓

---

### F-029 — Missing `.claude-plugin/marketplace.json` {#f-029}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 3)

**Source of truth:** [Plugin marketplaces → Marketplace structure](https://code.claude.com/docs/en/plugin-marketplaces#marketplace-structure), and the canonical layout in [anthropics/claude-code `.claude-plugin/marketplace.json`](https://github.com/anthropics/claude-code/blob/main/.claude-plugin/marketplace.json).

Without a marketplace catalog, users can only install via `claude --plugin-dir ./` (developer-only flow). The `/plugin install` UX, the Discover tab, the version-pinning semantics, and team-wide marketplace adoption are all gated on shipping a marketplace.json.

**Fix:** added [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json) with `name: "qa-my-app"`, `owner`, a single plugin entry pointing at `"source": "./"`, plus `category`, `keywords`, and `$schema`. The marketplace and the plugin share the same `.claude-plugin/` directory — explicitly permitted by the docs when the repo hosts a single plugin.

---

### F-030 — Missing `CHANGELOG.md` {#f-030}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 3)

**Source of truth:** [plugins-reference → Standard plugin layout](https://code.claude.com/docs/en/plugins-reference#standard-plugin-layout) shows `CHANGELOG.md` at the plugin root, and [plugin-marketplaces → Version resolution](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution) warns: "Setting `version` pins the plugin; users only update on bump."

Our `plugin.json` pins `0.2.0` — so a CHANGELOG is the only way for users (and our own future selves) to see what changed between bumps. Anthropic, flow-next, and plugin-dev all ship one.

**Fix:** added [CHANGELOG.md](../CHANGELOG.md) in Keep-a-Changelog format. Includes `[Unreleased]`, `[0.2.0]`, `[0.1.0]` sections and compare links to GitHub.

---

### F-031 — Missing `LICENSE` file {#f-031}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 3)

`plugin.json` declared `"license": "MIT"` but no LICENSE file existed at the repo root. Enterprises run license-compliance scans (FOSSA, ScanCode, GitHub License Detector) that expect a SPDX-identifiable LICENSE file at the root — a manifest claim alone is not legally sufficient.

**Fix:** added [LICENSE](../LICENSE) with the canonical MIT text, copyright elwizard33 2026. SPDX detectors will now resolve to `MIT`.

---

### F-032 — No CI validation gate {#f-032}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 3)

Every serious Claude Code plugin in our survey runs `claude plugin validate . --strict` in CI. Without it, a future edit to `plugin.json`, `.mcp.json`, or any agent/skill frontmatter could silently break the manifest and only fail at install time on users' machines.

**Fix:** added [.github/workflows/validate.yml](../.github/workflows/validate.yml). Triggers on push to `main`, all PRs, and manual dispatch. Two steps: strict plugin validation + `node --check` on every `scripts/*.mjs` file.

---

### F-033 — Stale `docs/COMPLIANCE.md` violates single-file rule {#f-033}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 3)

Pass 2 established the rule that this `docs/AUDIT.md` is the single living audit file. `docs/COMPLIANCE.md` was a Pass-0 leftover duplicating the same content with stale data.

**Fix:** deleted `docs/COMPLIANCE.md`. All future audit content lands here.

---

### F-034 — Pinned `version` requires bump discipline {#f-034}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 3)

[plugin-marketplaces → Version resolution](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution): when a marketplace entry pins `version`, Claude Code will not pull newer commits from `source` — users stay on the pinned version until the bump. We intentionally pin to give users deterministic installs; in exchange we commit to bumping on every release and recording the diff in `CHANGELOG.md` (F-030).

No code change. The discipline is now visible to anyone reading `CHANGELOG.md`.

---

### F-035 — Marketplace `category` + discovery keywords {#f-035}

**Severity:** 🟢 Low · **Status:** ✅ OK (Pass 3)

[Plugin marketplaces → Plugin entry fields](https://code.claude.com/docs/en/plugin-marketplaces#plugin-entry-fields) — `category` and `keywords` drive Discover-tab placement and full-text search in the `/plugin` browser. Set `category: "testing"` (a recognised top-level category alongside `productivity`, `development`, `security`, `learning`) and the full keyword block, matching Anthropic's pattern for `security-guidance` (`category: "security"`).

No additional code change — included in the F-029 fix.

---

### F-036 — `browser_new_context` not confirmed in `@playwright/mcp` tool list {#f-036}

**Severity:** 🟠 High · **Status:** ✅ Fixed (Pass 4 addendum)

**Source of truth:** Live inspection of the `mcp__playwright__*` tool list + [sub-agents → `mcpServers` frontmatter](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent).

**Original defect:** Both `agents/page-analyzer.md` and `agents/test-runner.md` instructed Claude to call `mcp__playwright__browser_new_context` to isolate parallel agents. That tool does not exist in `@playwright/mcp`. Parallel runners shared the single default browser context — cookies, localStorage, and navigation state could bleed across agents.

**Root cause:** Plugin agents cannot declare `mcpServers` in their frontmatter ("ignored for security reasons" per the docs). The plugin's `.mcp.json` registers one shared Playwright process for the whole session. Any isolation strategy that relied on that single process was architecturally broken.

**Fix:** Introduced two new agent template files in `agents/`:

| File | Purpose |
|---|---|
| [agents/qa-page-analyzer.md](../agents/qa-page-analyzer.md) | Project-level page-analyzer with inline `mcpServers: playwright (stdio)` |
| [agents/qa-test-runner.md](../agents/qa-test-runner.md) | Project-level test-runner with inline `mcpServers: playwright (stdio)` |

The docs state: *"Inline servers defined here are connected when the subagent starts and disconnected when it finishes."* Each parallel spawn of `qa-page-analyzer` or `qa-test-runner` starts its own `npx @playwright/mcp@0.0.78` process — a fully independent Chromium/Firefox/WebKit instance with no shared state.

`/qa-my-app:init` now installs these files to `.claude/agents/` in **Phase 0** before any browser work begins. `/qa-my-app:scan` and `/qa-my-app:sync` include a guard that installs them if missing. All five skills have been updated to reference `Agent(qa-page-analyzer)` and `Agent(qa-test-runner)` (project-scope) instead of `Agent(qa-my-app:page-analyzer)` and `Agent(qa-my-app:test-runner)` (plugin-scope).

The `contextId` / `browser_new_context` parameters have been removed from both new agent files and from every skill payload that previously passed them — they are no longer needed since isolation is now at the process level.

---

### F-037 — `available_roles` and `exclude_globs` used comma-string instead of `multiple: true` {#f-037}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [plugins-reference → User configuration](https://code.claude.com/docs/en/plugins-reference#user-configuration) — `multiple: true` gives the user a proper array input UI rather than requiring manual comma formatting.

Both fields expected the user to type `admin,manager,user` as a single raw string. If a user typed `admin, manager` (with spaces), the split-by-comma logic in the skill body would produce `["admin", " manager"]` — the leading space would cause role matching to fail silently.

**Fix:** Added `"multiple": true` to both `available_roles` and `exclude_globs` in [.claude-plugin/plugin.json](../.claude-plugin/plugin.json). Updated descriptions to remove the "Comma-separated" instruction.

---

### F-038 — `author.email` and `author.url` missing from `plugin.json` {#f-038}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [plugins-reference → Metadata fields](https://code.claude.com/docs/en/plugins-reference#metadata-fields) — the complete `author` schema includes `name`, `email`, and `url`.

These optional fields appear in the `/plugin` picker's plugin detail view and are required by enterprise installs that run automated maintainer-contact lookups (e.g. for security vulnerability disclosure).

**Fix:** Added `"email": "elwizard33@users.noreply.github.com"` and `"url": "https://github.com/elwizard33"` to the `author` object in [.claude-plugin/plugin.json](../.claude-plugin/plugin.json).

---

### F-039 — `owner.email` missing from `marketplace.json` {#f-039}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [plugin-marketplaces → Owner fields](https://code.claude.com/docs/en/plugin-marketplaces#owner-fields).

**Fix:** Added `"email": "elwizard33@users.noreply.github.com"` to the `owner` object in [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json).

---

### F-040 — No `color` declared on any agent file {#f-040}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [sub-agents → Supported frontmatter fields](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields) — `color` accepts `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`.

During a `/qa-my-app:run-all` with 12 parallel runners, the task panel shows up to 17 simultaneous agent rows (12 test-runners + up to 4 page-analyzers + 1 supervisor). With no color, every row is visually identical — the user cannot distinguish runner types at a glance.

**Fix:** Assigned distinct colors across the five agent files:

| Agent | Color | Rationale |
|---|---|---|
| `page-analyzer` | blue | Browser reading/analysis |
| `route-discoverer` | green | Static discovery/exploration |
| `test-author` | yellow | Creative writing |
| `test-runner` | orange | Active execution |
| `catalog-reconciler` | purple | Planning/reconciliation |

---

### F-041 — No `when_to_use` on any skill file {#f-041}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [skills → Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference) — `when_to_use` provides "additional context for when Claude should invoke the skill, such as trigger phrases or example requests." Without it, Claude matches only the `description` text, which is accurate but not phrase-optimized.

**Fix:** Added `when_to_use` to all five skills with representative trigger phrases for each. The combined `description` + `when_to_use` text must stay under 1,536 characters (the skill-listing truncation limit) — verified for all five.

---

### F-042 — `run-all` skill: `disallowed-tools: AskUserQuestion` recommendation {#f-042}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 4)

**Source of truth:** [skills → Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference).

The research finding suggested adding `disallowed-tools: AskUserQuestion` to prevent Claude from stopping mid-run with unexpected questions. However, `run-all` intentionally uses `AskUserQuestion` once in Phase 0 to let the user select routes when no filter argument is provided. Disallowing the tool would break the interactive (no-args) invocation entirely.

The autonomous behavior is already enforced structurally: the skill's phase logic ensures `AskUserQuestion` is called at most once (before dispatch), and the dispatch/verify/update loop runs to completion with no further prompts. No change needed.

---

### F-043 — `SessionStart` hook lacked `matcher: "startup"` {#f-043}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 4)

**Source of truth:** [hooks → Matcher patterns](https://code.claude.com/docs/en/hooks#matcher-patterns) — `SessionStart` accepts a `matcher` with values `startup`, `resume`, `clear`, `compact`.

The `catalog-diff.mjs` script is only useful on fresh session starts (it compares the current catalog fingerprints against the working tree). Running it on `resume` (an existing session was re-opened), `clear` (conversation was cleared), or `compact` (context was compressed) adds 15 s of startup latency with no new information — the catalog state cannot have changed since the session was last active.

**Fix:** Added `"matcher": "startup"` to the `SessionStart` entry in [hooks/hooks.json](../hooks/hooks.json). Supersedes the finding in F-024 (which verified that `matcher` was correctly omitted at that time — the docs have since clarified that lifecycle-value matchers on `SessionStart` are supported).

---

### F-044 — `skills/init/SKILL.md` body listed `qa-my-app:page-analyzer` after Pass-4 rename {#f-044}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 5)

The line-36 instruction told Claude to "use the plugin-namespaced names: `qa-my-app:route-discoverer`, `qa-my-app:page-analyzer`, `qa-my-app:test-author`", but Phase 3 actually dispatches the project-scope `qa-page-analyzer` (installed by Phase 0). Pass 4's rename was incomplete.

**Fix:** Rewrote the instruction to split plugin-scope vs. project-scope explicitly.

---

### F-045 — `skills/run-all/SKILL.md` body referenced `qa-my-app:test-runner` {#f-045}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 5)

Two body paragraphs (lines 33 and 225) said "hands work off to `qa-my-app:test-runner`" and "All browser work goes through `qa-my-app:test-runner` subagents". The `allowed-tools` declaration and the actual dispatch in Phase 2.3 already used `qa-test-runner` (project-scope).

**Fix:** Synced both body references to `qa-test-runner`.

---

### F-046 — `skills/run/SKILL.md` description referenced `qa-my-app:test-runner` {#f-046}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 5)

The frontmatter `description` is shown verbatim in the `/plugin` picker and is what Claude reads to match the skill's purpose. The post-Pass-4 reality is project-scope dispatch.

**Fix:** Changed `via the qa-my-app:test-runner subagent` → `via the qa-test-runner subagent (project-level, installed by /qa-my-app:init)`. Also updated the in-skill link from `agents/test-runner.md` (now deleted) to [agents/qa-test-runner.md](../agents/qa-test-runner.md).

---

### F-047 — Dead `agents/page-analyzer.md` + `agents/test-runner.md` still shipped {#f-047}

**Severity:** 🟠 High · **Status:** ✅ Fixed (Pass 5 — deleted)

After Pass 4 swapped to the project-scope `qa-page-analyzer` / `qa-test-runner`, the old plugin-shipped versions remained in `agents/`. They still contained:

- References to `mcp__playwright__browser_new_context` — a tool that does not exist in `@playwright/mcp` (the original F-036 root cause).
- A `contextId` payload contract no skill passes anymore.

No skill's `allowed-tools` declaration or body instruction referenced them. They were dead weight that contradicted the actual workflow and confused anyone browsing `agents/`.

**Fix:** Deleted both files. The active agents are now: `route-discoverer`, `test-author`, `catalog-reconciler` (plugin scope) + `qa-page-analyzer`, `qa-test-runner` (project scope, templates installed by `/qa-my-app:init` Phase 0).

---

### F-048 — `qa-page-analyzer.md` lost the original `disallowedTools` guard {#f-048}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 5)

The original plugin-shipped `agents/page-analyzer.md` (now deleted, F-047) had `disallowedTools: Write, Edit` to reinforce that the analyzer returns JSON only and never writes files. Pass 4's new project-scope `agents/qa-page-analyzer.md` did not carry this guard.

**Fix:** Added `disallowedTools: Write, Edit, MultiEdit` to the frontmatter of [agents/qa-page-analyzer.md](../agents/qa-page-analyzer.md). `MultiEdit` added defensively in case a future Claude Code version exposes it (currently it's a deferred tool surface).

---

### F-049 — `skills/init/SKILL.md` granted unused `Bash(npx *)` permission {#f-049}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

The skill prints MCP-add commands (e.g. `claude mcp add ... -- npx -y @playwright/mcp@0.0.78`) as **copy-paste text** for the user to run interactively. The skill itself never invokes `npx`. `Bash(npx *)` in `allowed-tools` was over-broad — granted Claude permission to run any `npx` command from inside the skill body.

**Fix:** Removed `Bash(npx *)` from `allowed-tools`. `Bash(claude mcp *)` is retained (used in Phase 1 to check what's already connected).

---

### F-050 — README + CONTRIBUTING out of sync with Pass-4 rename {#f-050}

**Severity:** 🟡 Medium · **Status:** ✅ Fixed (Pass 5)

[README.md](../README.md) subagent table (line 271, 273) listed `qa-my-app:page-analyzer` / `qa-my-app:test-runner` and the body text (lines 84, 348, 354) referenced the same. [CONTRIBUTING.md](../CONTRIBUTING.md) layout block claimed `5 plugin-shipped subagents` (post-Pass-4-deletion it's 3 plugin + 2 project-scope templates).

**Fix:** Rewrote the subagent table to add a Scope column and split plugin-scope vs. project-scope rows. Added the explanatory note about why the browser agents must live at project scope. Updated CONTRIBUTING's layout diagram + namespace rule.

---

### F-051 — Floating GitHub Action tags in validate.yml {#f-051}

**Severity:** 🟠 High · **Status:** ✅ Fixed (Pass 5)

`uses: actions/checkout@v4` and `uses: actions/setup-node@v4` resolve via floating tags that the action owners can re-point at will. A compromised or re-tagged release would execute attacker-controlled code in CI with read access to the repo. Every top-tier plugin in the survey (Anthropic bundled, wshobson, flow-next) pins by commit SHA with a `# v…` version comment for human readability.

**Fix:** Pinned to live SHAs resolved via `gh api repos/actions/checkout/tags`:
- `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2`
- `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e  # v6.4.0`

Comment in the workflow file documents the convention so the next maintainer doesn't re-introduce floating tags.

---

### F-052 — Checkout did not set `persist-credentials: false` {#f-052}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

`actions/checkout` defaults to persisting the `GITHUB_TOKEN` into `.git/config` of the runner's working tree. Subsequent steps that invoke git could inadvertently leak or use the token. The plugin's validation workflow has no need to push or fetch — it only validates the working tree.

**Fix:** Added `with: persist-credentials: false` to the checkout step.

---

### F-053 — No CI verification that marketplace `source` paths resolve {#f-053}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

The strict validator only inspects the manifest's structure. It does not walk each `plugins[].source` entry and verify that the path contains a `.claude-plugin/plugin.json`. wshobson's CI does this explicitly to catch the "source was renamed but marketplace.json wasn't updated" failure mode.

**Fix:** Added a Node-script step in [.github/workflows/validate.yml](../.github/workflows/validate.yml) that iterates `plugins[].source`, joins it with `.claude-plugin/plugin.json`, and exits non-zero if any path is missing. Currently we have one plugin entry with `source: "./"`, so the script checks `./.claude-plugin/plugin.json` is present — guards against accidental relocation.

---

### F-054 — No CODEOWNERS file {#f-054}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

Without CODEOWNERS, any maintainer with write access can merge changes to the plugin manifest, the audit log (which is supposed to be append-only), the CI workflow, or the project-installed agents. Enterprise orgs run repo governance scanners that flag missing CODEOWNERS as a control gap.

**Fix:** Added [.github/CODEOWNERS](../.github/CODEOWNERS). Default `*` ownership is `@elwizard33`; manifest dir, AUDIT.md, workflows dir, and the two project-scope agent templates have explicit re-statements (last-rule-wins for clarity even when the same owner). Auto-assigns reviewers on PR.

---

### F-055 — No structured issue templates {#f-055}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

Anthropic's own `claude-code` repo and several top plugins use GitHub Issue Forms (YAML-based) instead of freeform Markdown issue templates. Bug reports without Claude Code version, plugin version, OS, and framework take a round-trip to triage.

**Fix:** Added three files under [.github/ISSUE_TEMPLATE/](../.github/ISSUE_TEMPLATE/):
- `bug_report.yml` — required Claude Code version, plugin version, OS dropdown, framework, which-skill multi-select, what-happened, expected, repro, optional logs, redaction-confirmed checkbox.
- `feature_request.yml` — problem statement, proposal, alternatives, scope dropdown, willing-to-PR checkbox.
- `config.yml` — `blank_issues_enabled: false`, two `contact_links`: GitHub Security Advisory flow (for vulnerabilities; do NOT file public issues), and the Claude Code plugins docs (for general install help).

---

### F-056 — No AGENTS.md cross-harness conventions doc {#f-056}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

Both `wshobson/agents` and `SuperClaude_Framework` ship an `AGENTS.md` at repo root following the [memory#agentsmd-interop](https://code.claude.com/docs/en/memory#agentsmd-interop) pattern (canonical context doc, harness-agnostic). It serves as a single source of truth for "what conventions apply when editing this repo".

**Fix:** Added [AGENTS.md](../AGENTS.md). Sections: Repo identity · Component layout (paths + scope) · 10 hard rules · Agent selection convention · Color coding · Where to look first · Don'ts · Test-before-shipping commands. Plain Markdown — readable by humans, Claude Code, Codex CLI, or any other harness. (We deliberately did NOT add a plugin-root `CLAUDE.md @AGENTS.md` import: the validator warns that CLAUDE.md is only loaded from the user's project root, not from a plugin — see F-065.)

---

### F-057 — Marketplace lacked `metadata` block + per-plugin `tags` {#f-057}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

`flow-next` and `wshobson/agents` both expose a marketplace-level `metadata: { description, version }` block separate from the per-plugin block. This appears in marketplace listings as the marketplace's own metadata (vs. the catalog of plugins inside it). `tags` is the marketplace's curated discovery facet, distinct from `keywords` (free-text index).

**Fix:** Added `metadata` to [.claude-plugin/marketplace.json](../.claude-plugin/marketplace.json). Added `tags: ["qa", "e2e", "playwright", "regression", "screenshot-testing"]` to the plugin entry, alongside the existing `keywords` block.

---

### F-058 — Per-plugin marketplace `author` lacked email + url {#f-058}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5)

Pass 4 added `email`/`url` to `plugin.json` `author` (F-038) and `email` to marketplace `owner` (F-039), but the per-plugin `author` block in marketplace.json was still name-only. Some marketplace tooling reads the per-plugin block exclusively.

**Fix:** Copied `email` and `url` into the plugins[0].author block. Also added `url` to the marketplace owner block for symmetry.

---

### F-059 — `commands/` directory considered, rejected {#f-059}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 5)

Every top community plugin ships slash commands under a `commands/` directory (Anthropic's `code-review`, `commit-commands`, etc.; flow-next's 19-command set under `commands/flow-next/`).

**Why we don't:** Per [plugins-reference → Skills](https://code.claude.com/docs/en/plugins-reference#skills), plugin **skills** auto-register as `/<plugin-name>:<skill-name>` slash commands. Our 5 skills already give us `/qa-my-app:init`, `/qa-my-app:scan`, `/qa-my-app:sync`, `/qa-my-app:run`, and `/qa-my-app:run-all`. Adding a parallel `commands/` directory would either duplicate the same workflows or shadow the auto-mapped paths — both bad.

---

### F-060 — `<example>` blocks in agent descriptions considered, rejected {#f-060}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 5)

Anthropic's `plugin-validator.md` uses three `<example>...<commentary>...</example>` blocks inside the agent description to boost natural-language selection reliability.

**Why we don't:** Every agent in this plugin is spawned by **name** from skill instructions (e.g. `Agent(qa-my-app:test-author)`, `Agent(qa-test-runner)`). Description-matched auto-selection never fires for these agents. The `<example>` blocks would consume frontmatter budget for no behavioral benefit.

---

### F-061 — `.codex-plugin/plugin.json` parallel manifest considered, rejected {#f-061}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 5)

flow-next ships a parallel `.codex-plugin/plugin.json` (with extra `interface` block: `displayName`, `shortDescription`, `developerName`, `category`, `capabilities`, `brandColor`) so the same source can install in Codex CLI as well as Claude Code.

**Why we don't:** Codex CLI compatibility isn't a stated goal. The translation cost (duplicated manifest, divergence risk on every release) outweighs the benefit until users ask for it. Revisit if multi-harness reach becomes a request.

---

### F-062 — `skills/<name>/references/` + `examples/` + `scripts/` subdirs considered, rejected {#f-062}

**Severity:** 🟢 Low · **Status:** ✅ OK by design (Pass 5)

Anthropic's `plugin-dev` skills are the canonical pattern: each skill is a directory with `SKILL.md` (concise body) plus `references/`, `examples/`, and `scripts/` subfolders that the agent loads on demand.

**Why we don't:** Our largest `SKILL.md` ([skills/run-all/SKILL.md](../skills/run-all/SKILL.md)) is ~8.5 KB, basically at Codex's 8 KB SKILL.md ceiling but well under Claude's runtime cap. We will adopt the subfolder pattern if any skill grows past those thresholds — for now, in-file is simpler and complete.

---

### F-063 — `asyncRewake` hooks for background test runs considered, deferred {#f-063}

**Severity:** 🟡 Medium · **Status:** ⚠️ Open (deferred to future pass)

Anthropic's `security-guidance` plugin uses `asyncRewake: true` + `rewakeMessage` + `rewakeSummary` on `PostToolUse`/`Stop` hooks to run long-running security reviews in the background and inject findings back into the conversation when complete. The same pattern would let `/qa-my-app:run-all` fire-and-forget: kick off the test fleet, free the user's session, then surface results asynchronously.

**Why deferred (not adopted now):** The current `/qa-my-app:run-all` supervisor runs synchronously inside one turn and streams per-task results live via the run queue file. Users see progress in real time. Switching to async-rewake is a significant rework (the supervisor's dispatch loop becomes a hook handler; verify/retry semantics need restructuring) for a UX improvement that hasn't been requested. Revisit if users say "I want to kick off the tests and come back to it tomorrow."

---

### F-064 — Critical YAML frontmatter parse failure across all 5 skills {#f-064}

**Severity:** 🔴 Critical · **Status:** ✅ Fixed (Pass 5)

Pass 4 added `when_to_use:` to every skill in the form:

```yaml
when_to_use: Use ... or re-baselining the entire test suite. Trigger phrases: "set up QA", "generate tests", ...
```

The strict YAML parser hits `phrases: "` inside the unquoted scalar and interprets `phrases:` as a nested mapping key starting a new value. Result: `mapping values are not allowed here` — the entire frontmatter is unparseable.

The runtime fallback when frontmatter fails to parse is **load with empty metadata**: every other field (`description`, `argument-hint`, `disable-model-invocation`, `allowed-tools`) is silently dropped. The skills still load and run, but:
- `disable-model-invocation: true` is gone → Claude can auto-trigger them from natural-language matches.
- `allowed-tools` is gone → every tool, every Bash command, and every agent spawn is allowed.
- `description` is gone → the `/plugin` picker shows empty entries.

The Pass-4 audit closed F-041 by reporting "Validation passed". That claim was incorrect; the current strict validator catches this and rejects all 5 skills.

**Fix:** Two parts.
1. Converted every `when_to_use:` value to a YAML literal block scalar (`|`):
   ```yaml
   when_to_use: |
     Use ... Trigger phrases include "set up QA", "generate tests", ...
   ```
   The `|` marker tells the parser "the next indented block is the literal value", so quotes and colons inside the value are no longer parser-significant.
2. Rephrased `Trigger phrases: "x"` → `Trigger phrases include "x"` so the value reads cleanly to a human as well. Eliminates the colon-space-quote pattern entirely.

Both manifests now pass `claude plugin validate ... --strict`.

---

### F-065 — Plugin-root CLAUDE.md is not loaded {#f-065}

**Severity:** 🟢 Low · **Status:** ✅ Fixed (Pass 5 — file removed)

Pass 5 initially shipped a `CLAUDE.md` at the plugin root containing `@AGENTS.md` to test the cross-harness import. Strict validation produced the warning:

> CLAUDE.md at the plugin root is not loaded as project context. To ship context with your plugin, use a skill (skills/<name>/SKILL.md) instead.

The CLAUDE.md mechanism only loads from the user's working project root — not from a plugin directory. Shipping one in the plugin is misleading (suggests context that doesn't actually load).

**Fix:** Deleted plugin-root `CLAUDE.md`. The cross-harness conventions doc ([AGENTS.md](../AGENTS.md)) is preserved as plain Markdown — readable by anyone, not load-bearing harness state.

---

## Audit hygiene

- **Single file.** This is the only audit document. Each subsequent pass appends a new "Pass N" section and amends the master index above.
- **Stable ids.** `F-NNN` ids are assigned forever. A fixed finding stays in the table with its status updated — it never gets removed or renumbered.
- **Doc citations.** Every finding cites the docs URL it was checked against, so a future pass can re-verify against newer documentation.
- **Status values:** ✅ Fixed (Pass N), ✅ OK, ✅ OK by design, ⚠️ Open, ❌ Won't fix (with justification).
- **Numbering.** When opening a new pass, look at the largest existing `F-NNN` id and increment from there.

## Re-validate after any plugin change

```powershell
npx -y @anthropic-ai/claude-code plugin validate . --strict
```

Last run: 2026-05-28 (Pass 5) — ✔ marketplace manifest validation passed (strict); ✔ plugin manifest validation passed (strict). Pass-4's prior "passed" claim was incorrect (see F-064); Pass 5 verifies the validator's current end-clean output.

Validate both manifests in CI by pointing the CLI at each file:

```powershell
npx -y @anthropic-ai/claude-code plugin validate . --strict
npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict
```

The validator picks `marketplace.json` first when present, so plugin-manifest checks must explicitly target `plugin.json`.

---

## Pass 6 — 2026-05-28 (newer night) — docs re-sweep + supply-chain polish

**Sixth full re-audit against the latest Claude Code documentation AND a third survey of the top community plugins** (`anthropics/claude-code` bundled, `wshobson/agents` 36.1k★, `wshobson/commands` 2.5k★, `gmickel/flow-next`, `ComposioHQ/awesome-claude-plugins`). Goal stated by maintainer: "highest enterprise level." The plugin already passes strict validation end-clean; this pass focuses on UX polish, defense-in-depth on the project-scope browser agents, and removing latent drift traps in the marketplace catalog.

### Starting state

- `npx -y @anthropic-ai/claude-code plugin validate . --strict` — ✔ passed (no warnings, no errors)
- `npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict` — ✔ passed
- `node --check` on all 6 `scripts/*.mjs` — ✔ all clean
- All 65 prior findings verified in their claimed states in the working tree (no regressions since Pass 5)

### Doc-driven findings

Re-fetched the latest pages of [hooks](https://code.claude.com/docs/en/hooks), [plugins-reference](https://code.claude.com/docs/en/plugins-reference), [sub-agents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), and [plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces). New capabilities since Pass 5 and how we used them:

| Capability | Docs section | Action |
|---|---|---|
| `hookSpecificOutput.additionalContext` on `SessionStart` | [hooks → SessionStart decision control](https://code.claude.com/docs/en/hooks#sessionstart-decision-control) | ✅ Adopted (F-066) — `catalog-diff.mjs --session-start` now emits a JSON envelope so Claude proactively knows the catalog drifted and can suggest `/qa-my-app:sync` |
| `statusMessage` on hook entries | [hooks → Common fields](https://code.claude.com/docs/en/hooks#common-fields) | ✅ Adopted (F-069) — both `SessionStart` and `PostToolUse` now show a friendly spinner label |
| `if` permission-rule on hook entries | [hooks → Common fields](https://code.claude.com/docs/en/hooks#common-fields) | ❌ Rejected (F-070) — single-rule limitation forces 6× duplication; fast-path in script already costs <5 ms |
| `paths` glob on skill frontmatter | [skills → Frontmatter reference](https://code.claude.com/docs/en/skills#frontmatter-reference) | Skip — our skills are slash-only (`disable-model-invocation: true`), not auto-injected |
| `arguments` named-positional skill args | same | Skip — single-arg skills, `$ARGUMENTS` is fine |
| `disableSkillShellExecution` user setting | settings docs | Documented (F-073) — user-controlled lever, not plugin scope |
| Marketplace `metadata.pluginRoot` | [plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) | Skip — default `./` is correct for a single-plugin self-marketplace |

### Famous-plugin survey baseline

Third sweep across the most-installed plugins. The Pass-5 sweep already harvested 8 patterns and rejected 4; this sweep looked for what's emerged in the ecosystem since.

| Pattern | Where seen | Action |
|---|---|---|
| `plugin-eval` LLM-judge quality framework | `wshobson/agents` | ❌ Rejected (F-072) — overkill for single-plugin repo |
| `dependabot.yml` for SHA-pinned actions | many | ❌ Rejected for now (F-071) — 2 actions, low churn |
| `disallowedTools` denylist on browser-driving project agents | best-in-class browser plugins | ✅ Adopted (F-068) — added `Bash(rm -rf *)`, `Bash(git push *)`, `Bash(git reset --hard *)`, `Bash(npm publish *)`, `Bash(git commit *)` (runner only) |
| Removing duplicated `version` from marketplace plugin entry | docs warning, top plugins | ✅ Adopted (F-067) — stripped `version` from `marketplace.json` plugin entry |
| `<example>...<commentary>` blocks in agent descriptions | `anthropics/plugin-validator` | ❌ Re-rejected (already F-060) — by-name spawning only |
| `.codex-plugin/plugin.json` parallel manifest | `flow-next` | ❌ Re-rejected (already F-061) — multi-harness out of scope |
| Separate `commands/` directory | every top plugin | ❌ Re-rejected (already F-059) — skills already become slash commands |

### Changes applied

1. **`scripts/catalog-diff.mjs`** — new `--session-start` branch emits `hookSpecificOutput.additionalContext` JSON so Claude sees drift in its session context, not just the user (F-066).
2. **`hooks/hooks.json`** — dropped `--silent` from the `--session-start` invocation so the new JSON path is reached; added `statusMessage` to both hooks (F-066, F-069).
3. **`.claude-plugin/marketplace.json`** — removed duplicate `version` from the plugin entry to eliminate the silent-drift trap (F-067).
4. **`agents/qa-page-analyzer.md`, `agents/qa-test-runner.md`** — added `disallowedTools` denylist with destructive Bash patterns for defense-in-depth (F-068). Runner additionally bans `git commit` since results are committed by the user, not the agent.

### Validation after changes

```powershell
npx -y @anthropic-ai/claude-code plugin validate . --strict          # ✔ marketplace manifest validation passed
npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict   # ✔ plugin manifest validation passed
node --check scripts/catalog-diff.mjs                                # ✔ clean
```

All 8 new findings logged (F-066…F-073); 4 fixes shipped, 4 rejected/deferred with rationale recorded in the master index. Total: 73 tracked · 35 fixed · 37 OK/by design · 1 deferred (F-063).
