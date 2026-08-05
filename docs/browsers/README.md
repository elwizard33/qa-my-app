# Browser engines

QA My App is **browser-engine agnostic**. The two browser-driving subagents
(`qa-page-analyzer`, `qa-test-runner`) talk to a browser through a Model Context
Protocol (MCP) server declared **inline** in each agent's frontmatter. Swapping
that one `mcpServers` block swaps the engine — the agent prompts are written in
capability terms (navigate, click, fill, snapshot, screenshot, evaluate, read
console/network), so the same task catalog runs on any supported engine.

The engine is selected with the `browser_engine` setting in `/plugin`
(`.claude-plugin/plugin.json` → `userConfig.browser_engine`). `/qa-my-app:init`
Phase 0 writes the matching `mcpServers` block into `.claude/agents/` when it
installs the two browser agents. If you change `browser_engine` later, re-run
`/qa-my-app:init` (or edit the `mcpServers:` block in your project's
`.claude/agents/qa-page-analyzer.md` and `qa-test-runner.md` by hand and commit).

## Supported engines

| Engine (`browser_engine`) | MCP server | Browsers | Runs where | Best for |
|---|---|---|---|---|
| `playwright` *(default)* | `@playwright/mcp` | Chromium, Chrome, Edge, Firefox, WebKit | Local OS process per spawn | **Default.** Full screenshot / console / network fidelity, cross-browser, isolated local processes. |
| `chrome-devtools` | `chrome-devtools-mcp` | Google Chrome / Chrome for Testing only | Local OS process per spawn | DevTools-grade performance traces, Lighthouse audits, deep network + source-mapped console. |
| `stagehand` | Browserbase MCP (Stagehand) | Cloud (Browserbase) | Remote cloud session per spawn | AI-driven `act` / `observe` / `extract` on a hosted browser; no local browser install. **Experimental** — see caveats. |

Per-engine setup:

- [Playwright (default)](playwright.md)
- [Chrome DevTools](chrome-devtools.md)
- [Stagehand / Browserbase](stagehand.md)

## Why inline per-agent, not a shared server

Plugin-shipped subagents cannot declare inline `mcpServers` — Claude Code
silently ignores the field for security
([docs](https://code.claude.com/docs/en/sub-agents#scope-mcp-servers-to-a-subagent)).
That is exactly why the two browser agents live at **project scope** in
`.claude/agents/` (copied there by `/qa-my-app:init` Phase 0). Declaring the
engine inline gives every parallel spawn its **own** browser process/session, so
runners never share cookies, `localStorage`, or auth state. Whichever engine you
pick, keep that one-process-per-spawn property — it is what makes
`parallel_test_runners` safe.

## Capability → tool-name map

The agent prompts describe *what* to do; each engine names the *how* differently.

| Capability | Playwright MCP | Chrome DevTools MCP | Stagehand (Browserbase) |
|---|---|---|---|
| Navigate | `browser_navigate` | `navigate_page` / `new_page` | `navigate` |
| Click | `browser_click` | `click` | `act("click …")` |
| Type / fill | `browser_type` / `browser_fill_form` | `fill` / `fill_form` / `type_text` | `act("type …")` |
| Inspect / snapshot | `browser_snapshot` | `take_snapshot` | `observe` / `extract` |
| Screenshot to file | `browser_take_screenshot` | `take_screenshot` | — *(not exposed; see caveats)* |
| Evaluate JS | `browser_evaluate` | `evaluate_script` | — *(use `act`/`extract`)* |
| Console messages | `browser_console_messages` | `list_console_messages` | — |
| Network requests | `browser_network_requests` | `list_network_requests` | — |

> **Result-schema fidelity.** The `result.md` schema captures embedded
> screenshots plus console and network sections. Playwright and Chrome DevTools
> expose all of those directly. Stagehand/Browserbase focuses on AI-driven
> action and extraction and does **not** expose screenshot/console/network tools
> in its MCP surface, so those result sections are best-effort on that engine.
> For full-fidelity QA runs, stay on `playwright` (default) or `chrome-devtools`.
