---
title: Supported frameworks
description: Frameworks QA My App can discover routes from, and how to add your own.
---

| Framework | Route discovery strategy | Status |
|---|---|---|
| Next.js app dir | `app/**/page.{ts,tsx,js,jsx}` | ✅ |
| Next.js pages | `pages/**/*.{ts,tsx,js,jsx}` (excludes `_app`/`_document`/`_error`/`api`) | ✅ |
| Remix | `app/routes/**/*.{ts,tsx,js,jsx}` | ✅ |
| SvelteKit | `src/routes/**/+page.svelte` | ✅ |
| Angular | `*-routing.module.ts` + `provideRouter([{ path }])` | ✅ |
| Vue + Vue Router | `routes: [{ path }]` in `router/` | ✅ |
| Vite + React Router | `<Route path="…">` + `createBrowserRouter` | ✅ |
| Blazor (.NET) | every `*.razor` with `@page "…"` | ✅ |
| Flutter web | best-effort grep on `lib/**/*.dart` | ⚠ experimental |
| Plain HTML | every `**/*.html` outside `node_modules`/`dist`/`build` | ✅ |

## Adding a framework

Add a branch to `scripts/detect-framework.mjs` (detection) and a strategy block to `agents/route-discoverer.md` (per-framework discovery rules).
