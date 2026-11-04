# Stagehand / Browserbase engine (experimental)

`browser_engine: stagehand` — drives a **cloud** browser hosted on
[Browserbase](https://www.browserbase.com/) through the Stagehand MCP server.
Instead of low-level primitives, it exposes AI-driven, natural-language tools:
`navigate`, `act`, `observe`, `extract`, plus session lifecycle (`start`/`end`).

Reference: [Stagehand MCP setup](https://docs.stagehand.dev/v3/integrations/mcp/setup).

## When to use it

- You want browser automation without installing or maintaining local browsers.
- You want resilient, AI-driven steps (`act("click the Sign in button")`,
  `extract("the order total")`) that tolerate small DOM changes.
- You already have a Browserbase account.

> **Experimental — read the caveats.** The Browserbase MCP surface centers on
> `act` / `observe` / `extract` / `navigate`. It does **not** expose
> screenshot-to-file, console-message, or network-request tools the way
> Playwright and Chrome DevTools do. Because `result.md` embeds screenshots and
> reports console/network failures, those sections will be **best-effort** on
> this engine. For full-fidelity QA runs, prefer [`playwright`](playwright.md)
> (default) or [`chrome-devtools`](chrome-devtools.md).

## Prerequisites

1. A Browserbase account.
2. A Browserbase **API key** and **Project ID** from the dashboard.

## Configuration

This plugin uses the **hosted (HTTP)** Browserbase MCP. `/qa-my-app:init` writes
this `mcpServers` block into each project-level browser agent
(`.claude/agents/qa-page-analyzer.md`, `.claude/agents/qa-test-runner.md`)
with a literal placeholder — the plugin never reads or transmits your API key
for you:

```yaml
mcpServers:
  - browserbase:
      type: http
      url: "https://mcp.browserbase.com/mcp?browserbaseApiKey=REPLACE_WITH_YOUR_BROWSERBASE_API_KEY"
```

Claude Code only substitutes a `sensitive: true` config value into skill or
agent content as a placeholder, never the real value, so init can't write
the real key into these files directly. Instead, set your key once via
`/plugin` → qa-my-app → Configure → **Browserbase API key** (stored in your
OS keychain, never in `settings.json`). The plugin's `PostToolUse` hook
(`scripts/resolve-browser-secrets.mjs`) runs after every file write; it
reads the stored key from its own hook-process environment —
`CLAUDE_PLUGIN_OPTION_BROWSERBASE_API_KEY`, never visible to Claude or to
this conversation — and replaces the placeholder in both files on disk. If
you set the key before running `/qa-my-app:init`, it resolves automatically
during init. If you set it afterward, the next file write (any edit)
resolves it.

You can also register the server from the CLI instead of editing the inline
block, pasting your own key directly into your own shell:

```bash
claude mcp add --transport http browserbase \
  "https://mcp.browserbase.com/mcp?browserbaseApiKey=<your-key>"
```

### Optional query parameters

Append to the URL to tune the hosted session (see the Stagehand docs):

| Param | Purpose |
|---|---|
| `modelName` | LLM driving `act`/`extract` (default `google/gemini-2.5-flash-lite`). |
| `modelApiKey` | Your own model key if you bring your own LLM. |
| `proxies=true` | Route through Browserbase proxies. |
| `advancedStealth=true` | Anti-bot stealth mode. |
| `keepAlive=true` | Keep sessions warm between calls. |

## Isolation & parallelism

Each spawn opens its **own** Browserbase cloud session, so isolation is handled
server-side — no shared local profile to worry about. Mind your Browserbase plan's
concurrent-session limit when setting `parallel_agents` / `parallel_test_runners`.

## Tool-name differences

On this engine the agent uses `navigate`, `act`, `observe`, and `extract` instead
of the `browser_*` primitives. Map app actions to natural-language `act` calls and
read state with `observe` / `extract`. See the
[capability map](README.md#capability--tool-name-map).

## Settings that do **not** apply

- `browser_channel` is ignored — the cloud chooses the browser.
- `browser_headless` is ignored — cloud sessions are headless by nature.
