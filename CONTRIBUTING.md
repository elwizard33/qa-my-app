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
4. **No breaking the namespace.** The internal plugin `name` is `qa-catalog`.
   Renaming would break every `Agent(qa-catalog:route-discoverer)` reference,
   every `/qa-catalog:*` slash command, and every existing install. The
   user-visible `displayName` is "QA My App"; that's the only brand-level lever.
   The two browser-driving agents (`qa-page-analyzer`, `qa-test-runner`) are
   project-scope, not plugin-namespaced — they live in `agents/` as templates
   that `/qa-catalog:init` Phase 0 copies into the user's `.claude/agents/`.

## Repo layout

```
.claude-plugin/
  plugin.json        # plugin manifest (single source of truth)
  marketplace.json   # marketplace catalog so users can /plugin install
agents/              # 3 plugin-shipped subagents + 2 project-scope templates
                     # (route-discoverer, test-author, catalog-reconciler are
                     #  plugin-namespaced; qa-page-analyzer + qa-test-runner are
                     #  copied to .claude/agents/ by /qa-catalog:init Phase 0
                     #  so they can declare inline mcpServers)
skills/              # 5 slash-command skills (init, scan, sync, run, run-all)
hooks/hooks.json     # SessionStart + PostToolUse
scripts/             # Pure-stdlib Node helpers + the precommit installer
.mcp.json            # Bundled Playwright MCP (stdio)
docs/AUDIT.md        # Single living audit log — append Pass N section per audit
```

Full architecture diagram and design rationale: [docs/AUDIT.md](docs/AUDIT.md).

## Workflow

1. Fork → branch → edit. Keep commits focused.
2. Run validation locally:
   ```powershell
   npx -y @anthropic-ai/claude-code plugin validate . --strict
   npx -y @anthropic-ai/claude-code plugin validate ./.claude-plugin/plugin.json --strict
   ```
3. If you touched any `.mjs` script, run `node --check scripts/<name>.mjs`.
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
- Reference the agent from a skill as `Agent(qa-catalog:<name>)` — the plugin
  namespace prefix is mandatory.

## Adding a skill

- Place under `skills/<name>/SKILL.md`.
- Frontmatter requirements: `description`, `disable-model-invocation: true`
  (workflow skills only run when the user types `/qa-catalog:<name>`, never
  auto-invoked).
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

1. Bump `version` in [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json),
   [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json), and the
   marketplace `plugins[0].version` field. Keep the three in sync.
2. Move `[Unreleased]` entries into a new `[X.Y.Z] — YYYY-MM-DD` section in
   [CHANGELOG.md](CHANGELOG.md).
3. Tag: `git tag vX.Y.Z && git push --tags`.
4. CI will re-run; create a GitHub Release pointing at the tag.

Per the [plugin-marketplaces version-resolution
docs](https://code.claude.com/docs/en/plugin-marketplaces#version-resolution),
pinned `version` means users only update on bump — the CHANGELOG is therefore
the canonical source of truth for what each release changes.

## Audit log discipline

[`docs/AUDIT.md`](docs/AUDIT.md) is a **single living file**. Each new audit
pass appends a `## Pass N — YYYY-MM-DD` section and amends the master findings
index at the top. Finding ids (`F-NNN`) are **stable forever** — never
renumbered or reused. Fix status updates land in the master index; the
historical body stays as written.

## Code of conduct

By contributing you agree to abide by the [Contributor Covenant
v2.1](CODE_OF_CONDUCT.md).
