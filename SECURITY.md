# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x   | ✅ |
| < 0.1   | ❌ |

This plugin uses semantic versioning. Security fixes ship in patch releases off
the latest minor (e.g. `0.1.1`). Older minors receive **no** backports.

## Reporting a vulnerability

If you find a security issue in this plugin, **please do not open a public GitHub
issue.** Instead, file a private report via:

- GitHub Security Advisories — preferred — open at
  <https://github.com/elwizard33/qa-my-app/security/advisories/new>.
- Email — fallback — send to the address listed on
  <https://github.com/elwizard33>. Use a subject line of
  `[qa-my-app] security`.

Please include:

1. A description of the issue and the affected surface (skill, agent, hook, MCP
   server, helper script, or `userConfig` field).
2. Steps to reproduce.
3. Your assessment of impact (data exposure, sandbox escape, prompt injection,
   credential leak, etc.).
4. Any suggested mitigation.

We aim to acknowledge reports within **3 business days** and ship a fix within
**14 days** for critical issues. After the fix ships we will publish a GitHub
Security Advisory and credit you (unless you request anonymity).

## Trust model & threat surface

This plugin runs inside Claude Code, which the user has already trusted with
local filesystem and shell access. The plugin itself adds:

| Surface | Trust posture |
|---|---|
| `hooks/hooks.json` | Runs `node ${CLAUDE_PLUGIN_ROOT}/scripts/catalog-diff.mjs` on `SessionStart` and after every `Write`/`Edit`/`MultiEdit`. Both are pure stdlib Node scripts — no network, no eval, no shell exec. |
| `scripts/*.mjs` | All helpers ship as plain ES modules. No `child_process`, no `fetch` to remote hosts, no dynamic `import()` of user-controlled paths. Verify by reading the sources. |
| `scripts/install-precommit.sh` | Writes a git `pre-commit` hook into the **target** project. Runs only when the user explicitly invokes the install script — never automatically. |
| Bundled Playwright MCP | Drives a real browser against the URL given in `userConfig.dev_url` (or auto-detected from the project's framework manifest). Uses the user's local Playwright cache. The MCP server is hosted by the user's machine — no external services. |
| `userConfig.auth_password` | Marked `sensitive: true`. Stored in the OS keychain via Claude Code's secure storage. Never substituted into rendered prompts. |
| `QA-tests/.qa-catalog/auth.local.json` (per-role credential map) | **Gitignored** by `/qa-my-app:init`. Holds only non-secret usernames + storageState paths + `${ENV_VAR}` references — never a literal password. `scripts/auth-resolve.mjs` interpolates the env vars at resolution time; it is read-only and never writes secrets. Status reports redact every value. Per-role Playwright sessions live under `QA-tests/.qa-catalog/state/` (also gitignored). |
| `userConfig.auth_username`, `dev_url`, `default_role`, `available_roles`, `auth_storage_state_path`, `auth_credentials_file`, etc. | Non-sensitive. Stored in `settings.json`. |

## Out of scope

- Vulnerabilities in Claude Code itself — report to Anthropic at
  <https://docs.claude.com/en/docs/claude-code/security>.
- Vulnerabilities in the bundled Playwright MCP — report upstream at
  <https://github.com/microsoft/playwright-mcp/security>.
- Vulnerabilities in defect-tracker MCPs the user connects (GitHub, Jira, Azure
  DevOps) — report to those projects.

## Prompt-injection guarantees

Plugin-shipped subagents (`route-discoverer`, `test-author`,
`catalog-reconciler`) cannot declare `hooks`, `mcpServers`, or
`permissionMode` per the [Claude Code plugin
spec](https://code.claude.com/docs/en/plugins-reference#agents). The two
browser-driving agents (`qa-page-analyzer`, `qa-test-runner`) run at project
scope — they declare inline `mcpServers` and are copied into `.claude/agents/`
by `/qa-my-app:init`, so a malicious target site cannot escalate privilege
through a runner. The supervisor validates every `result.md` against
`scripts/verify-result.mjs` before treating its contents as authoritative.

Sensitive `userConfig` values (currently only `auth_password`) are never
substituted into skill/agent rendered content — only into `mcpServers.env`. This
prevents the LLM context from observing the secret even when the secret is in
use.
