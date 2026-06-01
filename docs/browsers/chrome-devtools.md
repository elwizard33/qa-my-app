# Chrome DevTools engine

`browser_engine: chrome-devtools` — drives a real Google Chrome through the
[`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp)
server (built on Puppeteer + the Chrome DevTools Protocol). Use it when you want
DevTools-grade signal: performance traces, Lighthouse audits, and deep
network/console inspection with source-mapped stack traces.

## When to use it

- Your app targets Chrome and you want DevTools-level fidelity.
- You care about performance insights (`performance_start_trace`,
  `performance_analyze_insight`) or `lighthouse_audit`.
- You want richer network and source-mapped console data than the default.

> **Chrome-only.** `chrome-devtools-mcp` officially supports Google Chrome and
> Chrome for Testing. Other Chromium browsers may work but are unsupported. For
> Firefox/WebKit coverage, use the [Playwright](playwright.md) engine.

## Configuration

`/qa-catalog:init` writes this `mcpServers` block into each project-level browser
agent (`.claude/agents/qa-page-analyzer.md`, `.claude/agents/qa-test-runner.md`):

```yaml
mcpServers:
  - chrome-devtools:
      type: stdio
      command: npx
      args: ["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]
```

- `--isolated` gives each spawn a **temporary** user-data dir that is cleaned up
  on exit. This is important for parallel safety: without it,
  `chrome-devtools-mcp` shares a single profile dir across all instances and
  parallel runners would collide on cookies/`localStorage`.
- `--headless` runs without a visible window. Drop it (or set
  `browser_headless: false`) to watch the browser. To launch a non-headless
  window, omit the flag.
- To pin a channel, add `--channel=stable|beta|dev|canary`.

### Concurrency note

If your Claude Code build shares a single MCP server across subagents instead of
spawning one per agent, add `--experimentalPageIdRouting` so each agent can route
tool calls to its own tab. With the inline-per-agent model this plugin uses
(one server process per spawn), `--isolated` alone is sufficient.

## Tool-name differences

The agent prompts are engine-neutral; on this engine the underlying tools are
`navigate_page` / `new_page`, `click`, `fill` / `type_text`, `take_snapshot`,
`take_screenshot`, `evaluate_script`, `list_console_messages`,
`list_network_requests`. See the [capability map](README.md#capability--tool-name-map).

## Relevant settings (`/plugin`)

| Setting | Effect |
|---|---|
| `browser_channel` | Map to `--channel` (`stable`/`beta`/`dev`/`canary`). `chromium`/`webkit`/`firefox` are not valid here — use Playwright for those. |
| `browser_headless` | `true` keeps `--headless`; `false` drops it for a visible window. |
| `settle_ms`, `parallel_*` | Same meaning as the default engine. |

## Requirements

- Node.js (current LTS) + `npx`.
- Google Chrome (current stable) or Chrome for Testing installed.

## Privacy

`chrome-devtools-mcp` collects anonymous usage statistics by default and may send
performance trace URLs to the Chrome UX Report (CrUX) API. Disable with
`--no-usage-statistics` and `--no-performance-crux`, or set the `CI` /
`CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS` env vars. See the upstream README.
