---
title: How it works — the task catalog
description: How QA My App separates understanding the app from running the tests to keep runs deterministic and reviewable.
---

Most "AI testing" tools re-derive *what to test* on every run — slow, non-deterministic, impossible to review. QA My App separates **understanding the app** from **running the tests** by persisting an in-repo **task catalog** under `QA-tests/`:

1. **Discover once, test forever.** The catalog is a versioned source of truth for what every page is supposed to do — every form field, every validator, every modal, every destructive button, every role gate. It lives in your repo so reviewers can read it like documentation.
2. **Standardised surface.** Every route has the same canonical task shapes — happy path, validation matrix, modal coverage, button coverage, edge cases. The runner parses and executes them deterministically, **filling and submitting every form and dialog for real** and asserting the observable result (success toast, new row, error banner) — only destructive actions stay gated.
3. **Drift-aware.** Fingerprints + hooks flag the moment a UI changes so the catalog is rebuilt only where needed.
4. **Parallel by construction.** Because tasks are uniform, the orchestrator can fan them out across N browser agents without coordination overhead.
5. **Diffable history.** Same input → same plan → same outputs → diff across commits.

The catalog is the engine room. You don't have to look at it — but it's why subsequent runs are fast, deterministic, and PR-reviewable.

**Inner loop vs. full suite.** `/qa-my-app:run-all` executes the whole catalog; `/qa-my-app:verify` is the change-scoped counterpart — it resolves what changed (this conversation + the uncommitted diff, a branch/PR range, or a connected ticket's acceptance criteria), re-authors only the affected tasks, and runs them, reporting pass/fail per acceptance criterion.

## Verification

A result isn't trusted on its claim alone — every `result.md` a `qa-test-runner` writes is checked twice before it counts:

1. **Schema + cross-check.** `verify-result.mjs` rejects contradictions (a top-level PASS with a failing TC, a `Screenshots` count that doesn't match the embedded references or the files on disk) and raises non-blocking warnings (console errors on a PASS, zero visual evidence, a suspiciously small or byte-identical screenshot).
2. **Vision spot-check.** `run`, `run-all`, and `verify` read the actual screenshot evidence for every FAIL/BLOCKED task plus each PASS's final screenshot (and its first, when step 1 raised a warning), and compare the image against the claim in `result.md`. A disagreement — a `mismatch` — is treated exactly like a schema failure: one retry, then re-verify. Past 12 images in a batch, the check fans out to the `qa-my-app:result-reviewer` subagent so the supervisor's own context never fills with pixels.

`qa-test-runner` runs a lighter version of step 2 live, too: it inspects every screenshot as it's captured and lets the image override a disagreeing accessibility snapshot before `result.md` is even written.

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
| `SessionStart` (`matcher: startup`) | Emits a `hookSpecificOutput.additionalContext` JSON envelope so Claude proactively knows the catalog drifted and can suggest `/qa-my-app:sync` at session boot. |
| `PostToolUse` after `Write\|Edit` (async) | Silent re-check after every file edit. Never blocks the tool loop. |
| Git `pre-commit` (installed during `/qa-my-app:init`) | Re-fingerprints staged source files. **Blocks the commit** if `QA-tests/catalog.json` is stale and prints the routes that drifted. Bypass with `git commit --no-verify` (not recommended). |

Together, these guarantee the catalog never lags behind the UI. The moment a developer edits a page component, Claude knows; the moment they try to commit it, Git knows.
