---
title: Authenticating protected routes
description: How QA My App logs in — the credential file, env-var references, and the four auth modes.
---

Most apps hide their interesting pages behind a login. QA My App reaches them through a single
gitignored credential file, `QA-tests/.qa-catalog/auth.local.json`, which holds **no literal
secrets** — only usernames, storageState paths, and `${ENV_VAR}` references.
[`scripts/auth-resolve.mjs`](https://github.com/elwizard33/qa-my-app/blob/main/scripts/auth-resolve.mjs)
interpolates those env vars at run time. It is read-only and never writes a secret anywhere.

:::caution[Why the `auth_password` setting isn't the answer]
Claude Code stores `sensitive: true` plugin config in your OS keychain and, by design,
**never substitutes it into skill or agent content**
([docs](https://code.claude.com/docs/en/plugins-reference#user-configuration)). A skill that wrote
`${user_config.auth_password}` into a subagent payload would hand the test runner that literal
string rather than your password. Sensitive values reach *hook* processes only, as
`CLAUDE_PLUGIN_OPTION_<KEY>`.

That's why every auth mode resolves through the credential file instead. Set `auth_username` if you
like — but the password belongs in `auth.local.json` as an env-var reference.
:::

## Set it up

`/qa-my-app:init` scaffolds the file and adds it to `.gitignore`. Fill in the roles you need:

```jsonc
{
  "version": 1,
  "defaultRole": "anonymous",
  "roles": {
    "anonymous": { "authMode": "none" },

    // shared-credentials: one login reused across protected routes
    "admin": {
      "authMode": "shared-credentials",
      "loginUrl": "/login",
      "username": "admin@acme.test",
      "password": "${QA_CRED_ADMIN_PASSWORD}"   // resolved from the environment
    },

    // storage-state: reuse a saved Playwright session, no login flow at all
    "user": {
      "authMode": "storage-state",
      "storageStatePath": ".qa-catalog/state/user.json"
    }
  }
}
```

Export the referenced variables before a run:

```bash
export QA_CRED_ADMIN_PASSWORD='…'
```

## Check what resolves

Output is redacted, so it's safe to paste into an issue or CI log:

```bash
node scripts/auth-resolve.mjs --status
```

```text
QA Credentials (per-role)
=========================
  source: QA-tests/.qa-catalog/auth.local.json
  default role: anonymous
  ✓ anonymous: none
  ✓ admin: shared-credentials
  ✗ manager: shared-credentials — missing QA_CRED_MANAGER_PASSWORD
```

`/qa-my-app:status` surfaces the same line. A role that fails to resolve has its tasks reported
**BLOCKED** rather than silently failing against an empty password — so a missing env var never
looks like a product bug.

## The four modes

| `auth_mode` | What happens | What you configure |
|---|---|---|
| `none` | No login. Only public routes are exercised. | Nothing. |
| `shared-credentials` | One login reused for every protected route. | A `shared-credentials` entry for your `default_role`, with `loginUrl`, `username`, and a `${ENV_VAR}` password. |
| `storage-state` | A saved Playwright session (cookies + localStorage) is injected before navigating — no login flow runs. | A `storage-state` entry with `storageStatePath`, or the `auth_storage_state_path` setting. |
| `per-role` | Each task's required role is looked up individually, so admin and viewer paths are tested as different users. | One entry per role in `roles`, plus `available_roles` so the route-discoverer can cross-reference guards. |

`per-role` is the one worth graduating to: it's what lets QA My App prove a viewer *can't* reach an
admin route, not just that an admin can.

## Keeping secrets out of git

- `auth.local.json` and `.qa-catalog/state/` are gitignored by `init`.
- The file itself holds only env-var **references**, so even if it leaks, no password does.
- `auth-resolve.mjs` has a `--status` mode that redacts every value; the skills use it for reporting
  and only call the secret-bearing mode when handing credentials to a runner.
- Resolved passwords are never printed back to you, and never written to `result.md`.

For CI, set the same `QA_CRED_*` variables as encrypted secrets — no file changes needed.
