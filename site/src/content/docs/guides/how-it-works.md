---
title: How it works — the task catalog
description: How QA My App separates understanding the app from running the tests to keep runs deterministic and reviewable.
---

Most "AI testing" tools re-derive *what to test* on every run — slow, non-deterministic, impossible to review. QA My App separates **understanding the app** from **running the tests** by persisting an in-repo **task catalog** under `QA-tests/`:

1. **Discover once, test forever.** The catalog is a versioned source of truth for what every page is supposed to do — every form field, every validator, every modal, every destructive button, every role gate. It lives in your repo so reviewers can read it like documentation.
2. **Standardised surface.** Every route has the same canonical task shapes — happy path, validation matrix, modal coverage, button coverage, edge cases. The runner parses and executes them deterministically.
3. **Drift-aware.** Fingerprints + hooks flag the moment a UI changes so the catalog is rebuilt only where needed.
4. **Parallel by construction.** Because tasks are uniform, the orchestrator can fan them out across N browser agents without coordination overhead.
5. **Diffable history.** Same input → same plan → same outputs → diff across commits.

The catalog is the engine room. You don't have to look at it — but it's why subsequent runs are fast, deterministic, and PR-reviewable.

## Catalog model

QA My App persists a `QA-tests/` directory:

- **`catalog.json`** — single source of truth. Includes `stack` (framework + libs descriptor) + `integrations` (which issue tracker is wired) + per-route metadata.
- **`catalog.md`** — human-readable mirror sorted by route.
- **`routes/<route-slug>.md`** — raw Page Analysis JSON per route (element inventory).
- **`tasks/T<NN>-<route-slug>-<flow-slug>.md`** — one task per significant user flow, enforced template.
- **`.qa-catalog/fingerprints.json`** — SHA-256 per cataloged source file. Drives drift detection.

Because tasks are uniform in shape, the orchestrator can fan them out across N runners with zero coordination overhead.

## Drift detection (hooks)

| Trigger | Action |
|---|---|
| `SessionStart` (`matcher: startup`) | Emits a `hookSpecificOutput.additionalContext` JSON envelope so Claude proactively knows the catalog drifted and can suggest `/qa-catalog:sync` at session boot. |
| `PostToolUse` after `Write\|Edit\|MultiEdit` (async) | Silent re-check after every file edit. Never blocks the tool loop. |
| Git `pre-commit` (installed during `/qa-catalog:init`) | Re-fingerprints staged source files. **Blocks the commit** if `QA-tests/catalog.json` is stale and prints the routes that drifted. Bypass with `git commit --no-verify` (not recommended). |

Together, these guarantee the catalog never lags behind the UI. The moment a developer edits a page component, Claude knows; the moment they try to commit it, Git knows.
