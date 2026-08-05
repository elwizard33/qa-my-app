#!/usr/bin/env node
// Resolves per-role QA credentials from QA-tests/.qa-catalog/auth.local.json.
// Read-only. Pure stdlib — no dependencies. Never writes secrets anywhere.
//
// The credential file is gitignored and user-maintained. Secret values are kept
// out of it by referencing environment variables with ${VAR} syntax, so the file
// on disk holds only non-secret usernames + env-var references + storageState
// paths. This script interpolates ${VAR} from process.env at resolution time.
//
// Modes:
//   --json                  Full role->credential map WITH resolved secrets.
//                           Consumed by /qa-my-app:init|run|run-all to build the
//                           credentialsByRole payload handed to the runner.
//   --role <name> [--json]  Resolve a single role (falls back to defaultRole,
//                           then to authMode:none). Used for ad-hoc checks.
//   --status [--json]       REDACTED summary (authMode + resolved/missing only,
//                           never the secret values). Safe for status reports.
//   (default)               Human-readable redacted summary.
//
// File schema (QA-tests/.qa-catalog/auth.local.json):
//   {
//     "version": 1,
//     "defaultRole": "anonymous",
//     "roles": {
//       "anonymous": { "authMode": "none" },
//       "admin": {
//         "authMode": "shared-credentials",
//         "loginUrl": "/login",
//         "username": "admin@acme.test",
//         "password": "${QA_CRED_ADMIN_PASSWORD}"
//       },
//       "user": {
//         "authMode": "storage-state",
//         "storageStatePath": ".qa-catalog/state/user.json"
//       }
//     }
//   }

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const roleArgIdx = argv.indexOf("--role");
const roleArg = roleArgIdx !== -1 ? argv[roleArgIdx + 1] : null;

const AUTH_FILE = join(cwd, "QA-tests", ".qa-catalog", "auth.local.json");
const STRING_FIELDS = ["username", "password", "loginUrl", "storageStatePath"];

function fail(obj) {
  // Emit a machine-readable error and exit non-zero so callers can branch.
  process.stdout.write(JSON.stringify(obj));
  process.exit(1);
}

function interpolate(value) {
  // Replace every ${VAR} with process.env[VAR]; track unresolved var names.
  const missing = [];
  if (typeof value !== "string") return { value: value ?? "", missing };
  const out = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name) => {
    const env = process.env[name];
    if (env === undefined || env === "") {
      missing.push(name);
      return "";
    }
    return env;
  });
  return { value: out, missing };
}

function resolveRole(name, def) {
  const authMode = (def && def.authMode) || "none";
  const resolved = { role: name, authMode };
  const missing = [];
  for (const field of STRING_FIELDS) {
    const raw = def ? def[field] : undefined;
    if (raw === undefined) {
      resolved[field] = "";
      continue;
    }
    const r = interpolate(raw);
    resolved[field] = r.value;
    for (const m of r.missing) missing.push(m);
  }
  // A storageState path is resolvable only if the file actually exists.
  if (authMode === "storage-state" && resolved.storageStatePath) {
    const p = isAbsolute(resolved.storageStatePath)
      ? resolved.storageStatePath
      : join(cwd, "QA-tests", resolved.storageStatePath);
    resolved.storageStateResolved = p;
    if (!existsSync(p)) missing.push(`storageState:${resolved.storageStatePath}`);
  }
  // Decide whether this role can actually authenticate.
  let ok = missing.length === 0;
  if (authMode === "shared-credentials" && (!resolved.username || !resolved.password)) ok = false;
  if (authMode === "storage-state" && !resolved.storageStatePath) ok = false;
  resolved.resolved = authMode === "none" ? true : ok;
  resolved.missing = [...new Set(missing)];
  return resolved;
}

function loadFile() {
  if (!existsSync(AUTH_FILE)) return { present: false, defaultRole: "anonymous", roles: {} };
  let raw;
  try {
    raw = JSON.parse(readFileSync(AUTH_FILE, "utf8"));
  } catch (e) {
    fail({ present: true, error: `Invalid JSON in ${AUTH_FILE}: ${e.message}` });
  }
  return {
    present: true,
    version: raw.version ?? 1,
    defaultRole: raw.defaultRole || "anonymous",
    roles: raw.roles && typeof raw.roles === "object" ? raw.roles : {},
  };
}

function redact(role) {
  // Drop secret-bearing fields; keep only posture + status.
  return {
    role: role.role,
    authMode: role.authMode,
    resolved: role.resolved,
    missing: role.missing,
    hasUsername: !!role.username,
    storageStatePath: role.storageStatePath || "",
  };
}

const file = loadFile();
const roleNames = Object.keys(file.roles);
const resolvedAll = {};
for (const name of roleNames) resolvedAll[name] = resolveRole(name, file.roles[name]);

// ---- single-role mode ----------------------------------------------------
if (roleArg) {
  let target = roleArg;
  if (!resolvedAll[target]) target = file.defaultRole;
  const role = resolvedAll[target] || resolveRole(roleArg, { authMode: "none" });
  if (flags.has("--json")) {
    process.stdout.write(JSON.stringify(flags.has("--status") ? redact(role) : role, null, 2));
  } else {
    const r = redact(role);
    process.stdout.write(
      `role: ${r.role}\nauthMode: ${r.authMode}\nresolved: ${r.resolved}` +
        (r.missing.length ? `\nmissing: ${r.missing.join(", ")}` : "") +
        "\n",
    );
  }
  process.exit(role.resolved ? 0 : 1);
}

// ---- status (redacted) mode ----------------------------------------------
const allResolved = roleNames.every((n) => resolvedAll[n].resolved);
if (flags.has("--status") || (!flags.has("--json") && !roleArg)) {
  const redacted = {};
  for (const n of roleNames) redacted[n] = redact(resolvedAll[n]);
  const summary = {
    present: file.present,
    source: file.present ? "QA-tests/.qa-catalog/auth.local.json" : null,
    defaultRole: file.defaultRole,
    rolesConfigured: roleNames,
    rolesResolved: roleNames.filter((n) => resolvedAll[n].resolved),
    allResolved,
    roles: redacted,
  };
  if (flags.has("--json")) {
    process.stdout.write(JSON.stringify(summary, null, 2));
  } else {
    const out = ["QA Credentials (per-role)", "========================="];
    if (!file.present) {
      out.push("  ✗ no auth.local.json — using single shared credential / none");
    } else {
      out.push(`  source: ${summary.source}`);
      out.push(`  default role: ${file.defaultRole}`);
      for (const n of roleNames) {
        const r = redacted[n];
        const tick = r.resolved ? "✓" : "✗";
        const detail = r.resolved
          ? r.authMode
          : `${r.authMode} — missing ${r.missing.join(", ") || "credentials"}`;
        out.push(`  ${tick} ${n}: ${detail}`);
      }
    }
    process.stdout.write(out.join("\n") + "\n");
  }
  process.exit(allResolved ? 0 : 1);
}

// ---- full map (with secrets) mode ----------------------------------------
const payload = {
  present: file.present,
  source: file.present ? "QA-tests/.qa-catalog/auth.local.json" : null,
  defaultRole: file.defaultRole,
  roles: resolvedAll,
};
process.stdout.write(JSON.stringify(payload, null, 2));
process.exit(allResolved ? 0 : 1);
