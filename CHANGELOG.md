# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the plugin uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
