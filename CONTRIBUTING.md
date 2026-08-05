# Contributing to QA My App

Thanks for your interest in improving this plugin. Contributions are welcome —
please follow the process below so review is fast.

## Ground rules

1. **One change per PR.** Don't mix refactors, behaviour changes, and doc
   updates in the same patch.
2. **No bypassing CI.** [`.github/workflows/validate.yml`](.github/workflows/validate.yml)
   runs `claude plugin validate . --strict` on both manifests plus `node --check`
   on every `.mjs` helper. All three must be green.
3. **No hardcoded model names.** Every plugin subagent uses `model: inherit`.
   New agents must do the same. Models are user-configurable; never
   string-literal a model id (`claude-opus-4-x`, `gpt-4o`, etc.).
4. **No breaking the namespace.** The plugin `name` is `qa-my-app` — matching the
   repo, the marketplace, and the docs site. Once the plugin is published to the
   community catalog this slug is **immutable**: Anthropic can only change it via
   a `renames` map. Renaming would also break every
   `Agent(qa-my-app:route-discoverer)` reference, every `/qa-my-app:*` slash
   command, and every existing install. The user-visible `displayName` is
   "QA My App"; that's the only brand-level lever.
   The two browser-driving agents (`qa-page-analyzer`, `qa-test-runner`) are
   project-scope, not plugin-namespaced — they live in `agents/` as templates
   that `/qa-my-app:init` Phase 0 copies into the user's `.claude/agents/`.

## Repo layout

```
.claude-plugin/
  plugin.json        # plugin manifest (single source of truth)
  marketplace.json   # marketplace catalog so users can /plugin install
agents/              # 3 plugin-shipped subagents + 2 project-scope templates
                     # (route-discoverer, test-author, catalog-reconciler are
                     #  plugin-namespaced; qa-page-analyzer + qa-test-runner are
                     #  copied to .claude/agents/ by /qa-my-app:init Phase 0
                     #  so they can declare inline mcpServers)
skills/              # 7 slash-command skills (init, scan, sync, status, run, run-all, verify)
hooks/hooks.json     # SessionStart + PostToolUse
scripts/             # Pure-stdlib Node helpers + the precommit installer
                     # (no .mcp.json — browser MCP is inline on the project-level agents)
docs/AUDIT.md        # Single living audit log — append Pass N section per audit
```

Full architecture diagram and design rationale: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
The single living audit log lives at [docs/AUDIT.md](docs/AUDIT.md).

## Workflow

1. Fork → branch → edit. Keep commits focused.
2. Run the test suite and validation locally:
   ```bash
   npm test          # node --test "tests/*.test.mjs" — no install needed
   npm run validate  # plugin validate --strict on both manifests
   ```
3. If you changed a `.mjs` script's behaviour, **add or update a test** under
   `tests/`. The suite uses the built-in `node:test` runner and has no
   dependencies — see [Testing](#testing).
4. Update [CHANGELOG.md](CHANGELOG.md) under `[Unreleased]` — every PR must
   describe its change there.
5. Open the PR. Fill in the template. CI must pass.

## Adding a subagent

- Place under `agents/<name>.md`.
- Frontmatter requirements: `model: inherit`, `memory: project`. Optional:
  `effort: low|medium|high`, `maxTurns: N`, `tools: [...]`,
  `disallowedTools: [...]`.
- **Forbidden frontmatter fields** (rejected by `--strict`): `hooks`,
  `mcpServers`, `permissionMode`. See [F-007 in
  docs/AUDIT.md](docs/AUDIT.md#f-007).
- Reference the agent from a skill as `Agent(qa-my-app:<name>)` — the plugin
  namespace prefix is mandatory.

## Adding a skill

- Place under `skills/<name>/SKILL.md`.
- Frontmatter requirements: `description`, plus `when_to_use` when the skill is
  model-invocable.
- **Invocation policy.** Any skill that overwrites the catalog or spawns a browser
  run (`init`, `scan`, `sync`, `run`, `run-all`) must set
  `disable-model-invocation: true` — Claude should never start a costly or
  destructive run on its own. Read-only or inner-loop skills (`status`, `verify`)
  omit it so Claude can trigger them from natural phrasing. Note that
  `disable-model-invocation: true` also keeps the `description` out of context
  entirely, so a `when_to_use` block on such a skill is inert.
- Skill name is derived from the directory; do not set `name:`.

## Adding a hook

- Edit `hooks/hooks.json`. Use exec form (`type: "command"`, `command`, `args`).
- Timeouts are in **seconds**, not milliseconds. See [F-013 in
  docs/AUDIT.md](docs/AUDIT.md#f-013).
- `async: true` is valid only on `type: "command"` hooks. See [F-005 in
  docs/AUDIT.md](docs/AUDIT.md#f-005).
- Reference scripts as `${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs` — never
  absolute paths.

## Releasing

1. Bump `version` in [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)
   and the top-level `version` in
   [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). Keep the
   two in sync. The marketplace `plugins[0]` entry has **no** `version` field by
   design — the plugin version resolves solely from `plugin.json`, avoiding the
   dual-source pitfall where `plugin.json` silently wins.
2. Move `[Unreleased]` entries into a new `[X.Y.Z] — YYYY-MM-DD` section in
   [CHANGELOG.md](CHANGELOG.md).
3. Tag: `git tag vX.Y.Z && git push --tags`.
4. CI will re-run; create a GitHub Release pointing at the tag.

Per the [plugin-marketplaces version-resolution
docs](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution),
pinned `version` means users only update on bump — the CHANGELOG is therefore
the canonical source of truth for what each release changes.

## Testing

The nine helpers under `scripts/` are the deterministic backbone of the plugin —
drift detection, the result-schema gate, credential resolution. They're covered
by a suite under `tests/` built on Node's built-in
[`node:test`](https://nodejs.org/api/test.html) runner, so there is **nothing to
install**:

```bash
npm test              # or: node --test "tests/*.test.mjs"
npm run test:watch    # re-run on change while iterating
```

Every script reads its project root from `CLAUDE_PROJECT_DIR`, which is what
makes them testable: each test builds a throwaway project tree in `os.tmpdir()`,
points the env var at it, runs the script as a subprocess, and asserts on the
JSON output **and the exit code** — several scripts (`catalog-diff --precommit`,
`auth-resolve`, `verify-result`) use the exit code as their real signal, so a
test that only checks stdout would miss a regression. Helpers live in
[`tests/helpers.mjs`](tests/helpers.mjs).

Guidelines when adding tests:

- **Assert on the contract, not the implementation.** These scripts are consumed
  by skills via their stdout JSON and exit code; that's the surface to pin.
- **Cover the failure path.** The valuable tests here are the ones that catch a
  result claiming `PASS` while a test case failed, or a credential silently
  resolving to an empty password.
- **Check your test can fail.** Break the code deliberately and confirm the test
  catches it before you trust it. A suite that has never failed proves nothing.
- Name tests as statements about behaviour, so a failure reads as a bug report.

## Audit log discipline

[`docs/AUDIT.md`](docs/AUDIT.md) is a **single living file**. Each new audit
pass appends a `## Pass N — YYYY-MM-DD` section and amends the master findings
index at the top. Finding ids (`F-NNN`) are **stable forever** — never
renumbered or reused. Fix status updates land in the master index; the
historical body stays as written.

## Conduct

Be respectful and professional in issues, PRs, and reviews. Harassment or
abusive behaviour is not tolerated; maintainers may remove contributions or
block contributors who violate this expectation.
