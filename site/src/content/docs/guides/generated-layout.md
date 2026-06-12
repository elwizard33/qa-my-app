---
title: Generated layout
description: The QA-tests/ directory the plugin creates in your target project.
---

## Full `QA-tests/` tree

```
QA-tests/
├── catalog.json                       # machine-readable index (source of truth)
├── catalog.md                         # human-readable table by route
├── routes/
│   └── customers.md                   # raw Page Analysis per route (element inventory)
├── tasks/
│   ├── T01-customers-list.md          # one task per significant flow
│   ├── T02-customers-create.md
│   └── ...
├── results/
│   ├── history.json                   # append-only run index
│   ├── latest.json                    # pointer to most recent run
│   ├── by-task/
│   │   └── T03-customers-edit/
│   │       └── latest.json            # pointer to most recent run that included this task
│   └── runs/
│       └── 2026-05-28T14-22-11Z/      # one folder per /qa-catalog:run[-all] invocation
│           ├── run.json               # run metadata + settings snapshot
│           ├── task-queue.json        # live task index (run-all only)
│           ├── report.html            # self-contained, auto-refreshing dashboard
│           ├── summary.md             # cross-task summary table
│           ├── T01-customers-list/
│           │   ├── result.md          # per-task result with embedded screenshots
│           │   ├── TC01-load.png
│           │   └── ...
│           └── T03-customers-edit/
│               └── ...
└── .qa-catalog/
    ├── fingerprints.json              # sha256 per analyzed source file
    └── backup-20251108-1530/          # created by /qa-catalog:scan before overwrite
```

## Task file template

Every task file is identical in shape:

- Preconditions + required role
- Test data with a concrete value for every field the happy path fills
- `### TC-01` Happy path — fill **every** field with valid data, **submit for real**, assert the concrete result (toast / new row / redirect), optionally reload to confirm persistence
- `### TC-02` Form validation matrix (one row per field × empty / pattern / max-length)
- `### TC-03` Modal coverage (submit valid + invalid inside the modal, plus the cancel path)
- `### TC-04` Button coverage (including destructive confirm + cancel)
- `### TC-05` Edge & negative cases
- `## Acceptance criteria` (only when authored from a ticket — maps each criterion to the TCs that prove it)
- Console + network expectations

## Result file schema

Every `result.md` is identical in shape and is validated by `scripts/verify-result.mjs` before the runner's output is accepted into the run. Excerpt:

```markdown
# T03-customers-edit: Edit customer — Result

| Field | Value |
|---|---|
| Result | PASS / FAIL |
| Task file | QA-tests/tasks/T03-customers-edit.md |
| Route | /customers/:id |
| Date (UTC) | 2026-05-28T14:23:02Z |
| Run id | 2026-05-28T14-22-11Z |
| Duration (s) | 41 |
| Role | admin |
| Browser channel | chromium |
| Headless | true |
| Screenshots | 8 |
| Console errors | 0 |
| Network failures | 0 |

## Test Case Results

### TC-01: Happy path — PASS
- Step 1: navigate to /customers/42 — page title is "Edit customer"
- Step 2: change email — toast "Saved"

### TC-02: Form validation — customer-form — PASS
| Field | Case | Expected | Actual | Result |
|---|---|---|---|---|
| email | pattern | "Invalid email" | "Invalid email" | ✓ |

## Acceptance criteria
<!-- present only when the task was authored from a ticket (e.g. via /qa-catalog:verify PROJ-123) -->
| # | Acceptance criterion | Verified by | Result |
|---|---|---|---|
| AC-1 | Editing a customer's email shows a "Saved" toast | TC-01 | ✓ |

## Screenshots
### TC-01
![Edit page loaded](TC01-load.png)

## Defects Found
- None
```

This is parsed by `scripts/results-index.mjs` to maintain `history.json` and the per-task `latest.json` pointers.
