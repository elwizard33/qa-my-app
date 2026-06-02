---
title: Settings
description: Every userConfig knob, editable via /plugin.
---

All runtime knobs live in `.claude-plugin/plugin.json` and are editable via `/plugin`. Sensitive values are injected as env vars only (`CLAUDE_PLUGIN_OPTION_<KEY>`) and never appear in transcripts.

| Setting | Default | Purpose |
|---|---|---|
| `dev_url` | _empty_ | Override framework-detected dev URL. |
| `parallel_agents` | `3` | Concurrent `page-analyzer` agents during init/scan/sync (1–12). |
| `parallel_test_authors` | `4` | Concurrent `test-author` agents during init/scan/sync (1–16). |
| `parallel_test_runners` | `3` | Concurrent `test-runner` agents during `/qa-catalog:run-all` (1–12). |
| `browser_engine` | `playwright` | Browser-automation engine: `playwright` (default, all browsers, full fidelity), `chrome-devtools` (Chrome-only, perf + Lighthouse), `stagehand` (Browserbase cloud, AI act/observe/extract — experimental). |
| `browser_channel` | `chromium` | For `playwright` / `chrome-devtools`: `chromium`, `chrome`, `msedge`, `firefox`, `webkit`. Ignored by `stagehand`. |
| `browser_headless` | `true` | Set false to watch agents work. Ignored by `stagehand` (cloud is always headless). |
| `settle_ms` | `5000` | Wait after navigation before snapshot (0–60000). |
| `auth_mode` | `none` | `none` / `shared-credentials` / `storage-state`. |
| `auth_username` | _empty_ | Used when `auth_mode = shared-credentials`. |
| `auth_password` | _empty (sensitive)_ | Env-only. |
| `auth_storage_state_path` | _empty_ | Playwright storage-state JSON file. |
| `default_role` | `anonymous` | Assumed role when guards don't restrict. |
| `available_roles` | _empty_ | Multi-value list of roles the app supports — cross-referenced against route guards. |
| `task_depth` | `deep` | `deep` / `standard` / `smoke`. |
| `max_tasks_per_route` | `6` | Upper bound the test-author enforces (1–20). |
| `exclude_globs` | _empty_ | Multi-value list of globs to skip during route discovery (e.g. `**/storybook/**`, `**/__tests__/**`). |

## Parallelism knobs

- **`parallel_agents`** — analyzer concurrency during `init`/`scan`/`sync`. Each agent spawns a real browser; the practical ceiling is whatever the dev server can serve concurrently.
- **`parallel_test_authors`** — pure markdown generation, no browser. Safe to keep high.
- **`parallel_test_runners`** — runner concurrency during `run-all`. Same browser-process cost as analyzers; the dev server's request capacity is the practical ceiling.
