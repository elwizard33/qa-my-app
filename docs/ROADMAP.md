# QA My App — Roadmap

> Living plan document. Each release gets a section; shipped sections stay as a
> record of what was intended versus what landed. Technical findings and audit
> history live in [AUDIT.md](AUDIT.md) — this file is about *direction*.

---

## v1.1.0 — Change-Aware QA

**Theme.** v1.0.0 could tell you a cataloged route's source *changed*. v1.1.0 should
tell you whether that change **matters**, and whether anything in the catalog
actually covers it.

**Positioning.** The differentiator is not "AI drives a browser" — plenty of tools do
that. It's that the knowledge of what your app should do **persists and evolves**.
Everything in this release should reinforce that story.

### Status

| Workstream | State |
|---|---|
| README repositioned around persistent QA memory | ✅ Done (uncommitted) |
| Behavioural test suite (54 tests) + contributor infra | ✅ Done (in `[Unreleased]`) |
| Change-Aware QA — significance triage | 📋 Planned |
| Change-Aware QA — coverage-gap detection | 📋 Planned |
| Change-Aware QA — gap authoring | 📋 Planned |
| Banner recomposition | 🎨 Needs design |
| GitHub repo description | 📋 Planned |
| *(reserved — additional change)* | ⬜ TBD |

---

### 1. The gap this release closes

What exists today:

| Script | Does | Doesn't |
|---|---|---|
| `catalog-diff.mjs` | SHA-compares cataloged source files; flags `stale` / `removed`; `--precommit` exits non-zero on drift | Judge whether a change is meaningful. Detect **added** routes — `added` is hardcoded `[]` and delegated to the route-discoverer during `sync` |
| `change-scope.mjs` | Maps changed files → affected routes + tasks (working tree, `--staged`, `--branch`, `--files`); reports `unmatched` | Say whether the affected tasks still *cover* the changed behaviour |

So the current loop is:

```text
change source → detect stale catalog → block commit → run sync
```

The target loop:

```text
change source → is it behaviourally significant? → does coverage exist? → author what's missing
```

The missing middle is **significance** and **coverage**.

---

### 2. Design: a three-stage pipeline, cheapest first

The hard constraint: **never run a browser on `git commit`.** A pre-commit hook that
launches Chromium is a hook developers disable within a day. Each stage must be able
to stop the pipeline.

```text
┌─ Stage 1 ── deterministic, no model, no browser, <100ms ─────────┐
│  git diff --cached                                               │
│         ↓  change-scope.mjs        (exists)                      │
│  affected routes + tasks                                         │
│         ↓  change-significance.mjs (NEW)                         │
│  { significance: none | low | high, signals: [...] }             │
└──────────────────────────────────────────────────────────────────┘
        │ none/low → exit 0, commit proceeds silently
        │ high ↓
┌─ Stage 2 ── model, no browser, seconds ──────────────────────────┐
│  coverage-auditor agent (NEW)                                    │
│  inputs: diff hunks + the route's existing task files            │
│  output: { covered: [...], gaps: [{behaviour, evidence}] }       │
└──────────────────────────────────────────────────────────────────┘
        │ no gaps → report "covered", exit 0
        │ gaps ↓
┌─ Stage 3 ── authoring, opt-in ───────────────────────────────────┐
│  test-author agent (exists) authors/updates tasks for the gaps   │
└──────────────────────────────────────────────────────────────────┘
```

#### Stage 1 — `scripts/change-significance.mjs` (new, pure stdlib)

Deterministic heuristics over the diff. No model call, so it's free and safe to run
on every commit.

**Raises significance:**

| Signal | Why |
|---|---|
| Added/removed form controls (`<input>`, `<select>`, `<textarea>`, `<form>`) | New fields need new validation cases |
| Changed validation schema (zod/yup/joi/class-validator, `required`, `maxLength`, `pattern`) | The validation matrix is now wrong |
| New conditional rendering (`&&`, ternary, `v-if`, `*ngIf`, `{#if}`) around interactive elements | A new branch nobody tests |
| Route guard / role check changes | Permission coverage is now wrong |
| Added/removed buttons, modals, dialogs | Button + modal coverage is now incomplete |
| New route file matching the framework's route glob | Zero coverage by definition |

**Does not raise significance:**

| Signal | Why |
|---|---|
| Only styling (class attributes, `.css`, tokens) | No behaviour change |
| Only copy inside non-validating text nodes | Assertions target roles/labels, not prose |
| Comments, imports, formatting | Inert |
| Changes under `exclude_globs`, test files, stories | Not user-facing |

Output contract (single-line JSON, same convention as the other scripts):

```json
{
  "significance": "high",
  "routes": ["/customers"],
  "signals": [
    { "file": "app/customers/CreateCustomerModal.tsx",
      "kind": "form-control-added",
      "detail": "select[name=customerType]" },
    { "file": "app/customers/schema.ts",
      "kind": "validation-changed",
      "detail": "companyName conditionally required" }
  ],
  "noCatalog": false
}
```

Exit `0` always — significance is data, not a verdict. The **hook** decides what to
do with it.

> **Honest limitation to document, not hide.** This is regex/AST heuristics over a
> diff, not comprehension. It will misjudge. Design so a false *negative* costs a
> missed prompt (recoverable via `sync`) and a false *positive* costs one cheap
> model call — never a blocked commit or a spurious browser run.

#### Stage 2 — `agents/coverage-auditor.md` (new subagent)

Plugin-scope (no browser, no `mcpServers`), `tools: Read, Grep, Glob`, `model: inherit`.

Given the diff hunks plus the existing task files for the affected route, answer one
question: **which changed behaviours have no covering test case?** It reads the task
files' `### TC-NN` blocks and the changed source, and returns structured gaps. It
never writes.

#### Stage 3 — authoring

Feed the gaps to the existing `test-author` agent via `settings.changedSummary`,
which it already accepts. Likely no agent changes needed — this is why the pipeline
lands cheaply.

---

### 3. Surface: extend `sync`, don't add a command

The plugin already has 7 skills. Adding an eighth for this would fragment the mental
model, because `sync` **already** reconciles the catalog with the code — coverage
gaps are the same job done better.

**Proposal:** `/qa-my-app:sync` gains coverage-gap detection as part of its normal
run, and the pre-commit hook gains the Stage 1 gate.

```text
/qa-my-app:sync              # reconcile + report coverage gaps (default)
/qa-my-app:sync --no-author  # report gaps, don't write tasks
```

The pre-commit guard becomes informative rather than purely obstructive:

```text
Changed: components/Button.tsx
Used by: 37 routes
Change:  text color #fff → #fafafa
QA significance: LOW
→ commit continues
```

```text
Changed: app/customers/CreateCustomerModal.tsx
Detected:
  + "customer type" selector
  + conditional company-name field
  + new required validation
Catalog: T13 customer-create · T14 customer-validation
Coverage gap: customer-type branching has no test case
→ run /qa-my-app:sync to update the catalog
```

**Alternative considered:** a distinct `/qa-my-app:evolve`. Rejected for now — the
verb is nicer but the capability overlaps `sync` almost entirely, and two commands
that both "make the catalog match the code" is a support burden. Revisit if the
authoring step grows semantics `sync` shouldn't own.

---

### 4. Acceptance criteria

- [ ] `change-significance.mjs` exists, pure stdlib, honours `CLAUDE_PROJECT_DIR`
- [ ] Emits single-line JSON; exits 0 regardless of significance
- [ ] Correctly classifies the two worked examples above (styling → low, new form control → high)
- [ ] Respects `exclude_globs`
- [ ] **Tests**: ≥12 cases in `tests/change-significance.test.mjs`, covering both the raises-significance and does-not-raise tables, plus `noCatalog` and empty-diff
- [ ] Mutation-checked, per the CONTRIBUTING testing guidance
- [ ] `coverage-auditor` agent added to the `agents` allowlist in `plugin.json`
- [ ] Pre-commit output matches the worked examples; **no browser is ever launched by a hook**
- [ ] `sync` reports gaps; `--no-author` suppresses writing
- [ ] Docs: README "Coming next" → shipped; new site guide; `docs/ARCHITECTURE.md` component table; AUDIT.md Pass 9
- [ ] CI green on Node 20 + 22

---

### 5. Release checklist

1. Land the reserved additional change.
2. Bump `version` → `1.1.0` in **both** `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` (keep in sync; the marketplace `plugins[0]` entry deliberately has no `version`).
3. Move `[Unreleased]` → `[1.1.0] — YYYY-MM-DD` in `CHANGELOG.md`.
4. Update the README version badge (currently hardcoded `1.0.0`).
5. Flip README "🤖 Coming next" to shipped — **only if Stage 2 actually landed.**
6. `npm test` · `npm run validate` · site build · `claude --plugin-dir .` skill-count check.
7. Tag `v1.1.0`, push, create the GitHub Release.

---

### 6. Non-code work

#### Banner recomposition

Keep the existing aesthetic exactly — dark charcoal, teal + purple accents,
hand-drawn elements, white handwritten wordmark. Change only the **composition**, so
the catalog rather than the browser is the visual subject.

- **Left:** `qa-my-app` wordmark, with the tagline **"Your code changes. Your QA follows."** beneath it.
- **Right:** replace the browser-inspection motif with the change→catalog→tests flow:

```text
customers/page.tsx
        ↓
    UI changed
        ↓
 ┌──────────────┐
 │  QA CATALOG  │
 │  ✓ Login     │
 │  ✓ Create    │
 │  + New modal │
 └──────────────┘
        ↓
   RUN 3 TESTS
        ↓
        ✓
```

The `+ New modal` line is the whole pitch in three words: the catalog *grew* because
the code changed. Worth keeping even if the rest is simplified.

#### GitHub repository description

Current — accurate but says nothing about why anyone should care:

> Claude Code plugin: auto-generated deep QA test catalog for any web app

Replace with:

> Persistent, change-aware QA for Claude Code. Build your app's QA catalog once and keep it synchronized as the code evolves.

Shorter alternative: *Give Claude Code a persistent QA memory for your web app.*

---

## Later / unscheduled

- **Added-route detection without a full `sync`.** `catalog-diff.mjs` hardcodes `added: []`. A cheap glob-vs-catalog comparison would let the hook say "3 new routes have no QA at all."
- **Coverage metrics.** `/qa-my-app:status` could report cataloged routes vs discovered routes, and tasks per route, to expose blind spots.
- **Cowork support.** Currently out of scope: every skill shells out to `Bash(node *)` against a git checkout with a local dev server. Revisit only if that surface gains those primitives.
