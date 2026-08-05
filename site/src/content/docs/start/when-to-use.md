---
title: When to use it
description: When QA My App is the right tool — and when to reach for something else.
---

| Use it when… | Use something else when… |
|---|---|
| You want broad test coverage with zero test code | You need component-level unit tests — use Jest / Vitest |
| Your app is web-based and serves HTTP | You're testing a native binary, a CLI, or a mobile app |
| You want PR-reviewable regression diffs (same input → same plan → same outputs) | You need one-shot smoke checks with no persistence — use a Playwright recorder directly |
| You want a deterministic catalog committed to your repo | You want fully model-derived ad-hoc test plans on every run |
| You want every failure filed automatically as a GitHub / Jira / ADO defect | You don't have an issue tracker connected and don't want one |

## What this plugin does

1. **Detect the framework** (Next.js, Remix, SvelteKit, Angular, Vue, Vite+React, Blazor, Flutter web, plain HTML).
2. **Discover every route** statically from the source tree, with auth/role/guard/HTTP-method metadata.
3. **Open each page** in a real browser via the configured browser engine (Playwright by default) and inventory every form field, validator, button, modal, dialog, tab, and table.
4. **Author deep test tasks** into `QA-tests/tasks/` using an enforced template — happy path (fill every field and **submit for real**) + validation matrix + modal coverage + button coverage + edge cases.
5. **Watch the codebase** via SessionStart + PostToolUse hooks and a Git pre-commit hook. When a route's source drifts from the catalog, you're nudged (or commits are blocked) until you run `/qa-my-app:sync`.
6. **Run one task, a subset, or every task in parallel** with `/qa-my-app:run` / `/qa-my-app:run-all`. Each spawn writes a date-stamped `result.md` with embedded screenshots, plus a top-level run summary and an append-only history index.
7. **Verify just what changed** with `/qa-my-app:verify` — scopes from the conversation + uncommitted diff, a branch/PR range, or a connected ticket's acceptance criteria, then re-authors and runs only the affected tasks.

This plugin is project-agnostic — no app-specific assumptions.
