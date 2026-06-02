---
title: Playwright (default)
description: The default browser engine — broadest coverage, full fidelity, zero setup.
---

`browser_engine: playwright` — the default. Uses the official [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) server over stdio. Nothing to install or sign up for; `npx` fetches it on first use and Playwright manages its own browser binaries.

## When to use it

- You want the broadest browser coverage — Chromium, Chrome, Edge, Firefox, WebKit.
- You want full `result.md` fidelity: embedded screenshots, console errors, and network failures all captured directly.
- You want fully local, isolated processes with zero cloud dependency.

This is the recommended engine for almost everyone.

## Configuration

`/qa-catalog:init` writes this `mcpServers` block into each project-level browser agent:

```yaml
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
```

Each parallel spawn starts its **own** `npx @playwright/mcp@latest` process — true OS-process isolation, no shared cookies/`localStorage`. No `browser_new_context` call is needed (or exposed); navigate directly.

## Relevant settings (`/plugin`)

| Setting | Effect |
|---|---|
| `browser_channel` | `chromium` (default), `chrome`, `msedge`, `firefox`, `webkit`. |
| `browser_headless` | `true` (default) runs without a visible window; `false` to watch. |
| `settle_ms` | Wait after navigation before snapshotting (slow SPAs). |
| `parallel_agents` / `parallel_test_runners` | Concurrent browser processes. The dev server is the practical ceiling. |

## Requirements

- Node.js + `npx` on PATH.
- First run downloads Playwright browser binaries (one-time, automatic).

## Notes

- Auth modes (`none`, `shared-credentials`, `storage-state`) are all supported. `storage-state` reads a Playwright `storageState` JSON and injects it via `browser_evaluate` before navigating.
- No account, API key, or network egress to third-party services.
