#!/usr/bin/env node
// Reports a one-shot health + inventory snapshot for the QA catalog in this project.
// Read-only. Reused by /qa-catalog:status. Pure stdlib — no dependencies.
//
// Modes:
//   (default)   human-readable status block (OpenWolf-style ✓ receipt)
//   --json      machine-readable status object to stdout
//
// Surfaces: browser-agent presence, catalog inventory (routes/tasks/auth),
// configured issue-tracker integrations, and the most recent run's totals.
// Drift detection is intentionally left to catalog-diff.mjs so the two scripts
// stay single-purpose.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const flags = new Set(process.argv.slice(2));

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

const agentPaths = {
  "qa-page-analyzer": join(cwd, ".claude", "agents", "qa-page-analyzer.md"),
  "qa-test-runner": join(cwd, ".claude", "agents", "qa-test-runner.md"),
};
const agents = Object.fromEntries(
  Object.entries(agentPaths).map(([name, p]) => [name, existsSync(p)]),
);

const catalogPath = join(cwd, "QA-tests", "catalog.json");
const catalog = readJson(catalogPath);

let catalogInfo = null;
if (catalog) {
  const routes = Array.isArray(catalog.routes) ? catalog.routes : [];
  const isRoleRestricted = (r) =>
    Array.isArray(r.rolesAllowed) &&
    r.rolesAllowed.some((role) => role && role.toLowerCase() !== "anonymous");
  catalogInfo = {
    version: catalog.version ?? null,
    framework: catalog.framework ?? null,
    devUrl: catalog.devUrl ?? null,
    generatedAt: catalog.generatedAt ?? null,
    routes: routes.length,
    protected: routes.filter((r) => r.requiresAuth).length,
    roleRestricted: routes.filter(isRoleRestricted).length,
    tasks: routes.reduce(
      (a, r) => a + (Array.isArray(r.tasks) ? r.tasks.length : 0),
      0,
    ),
    integrations: catalog.integrations ?? {},
  };
}

// Per-role credential health (redacted — never reads or prints secret values).
// We re-check ${ENV_VAR} references live so the report reflects the current shell.
const authFilePath = join(cwd, "QA-tests", ".qa-catalog", "auth.local.json");
const authFile = readJson(authFilePath);
let credentials = null;
if (authFile && authFile.roles && typeof authFile.roles === "object") {
  const envMissing = (val) => {
    if (typeof val !== "string") return [];
    const out = [];
    val.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, name) => {
      if (!process.env[name]) out.push(name);
      return "";
    });
    return out;
  };
  const roles = {};
  for (const [name, def] of Object.entries(authFile.roles)) {
    const mode = (def && def.authMode) || "none";
    let resolved = true;
    const missing = [];
    if (mode === "shared-credentials") {
      for (const f of ["username", "password"]) {
        for (const m of envMissing(def?.[f])) missing.push(m);
        if (!def?.[f]) resolved = false;
      }
    } else if (mode === "storage-state") {
      const p = def?.storageStatePath || "";
      if (!p) resolved = false;
      else if (!existsSync(join(cwd, "QA-tests", p))) missing.push(`storageState:${p}`);
    }
    if (missing.length) resolved = false;
    roles[name] = { authMode: mode, resolved, missing: [...new Set(missing)] };
  }
  credentials = {
    present: true,
    source: "QA-tests/.qa-catalog/auth.local.json",
    defaultRole: authFile.defaultRole || "anonymous",
    rolesConfigured: Object.keys(roles),
    rolesResolved: Object.keys(roles).filter((n) => roles[n].resolved),
    roles,
  };
}

const historyPath = join(cwd, "QA-tests", "results", "history.json");
const history = readJson(historyPath);
let lastRun = null;
if (history && Array.isArray(history.runs) && history.runs.length > 0) {
  const run = history.runs[history.runs.length - 1];
  lastRun = {
    runId: run.runId ?? null,
    finishedAt: run.finishedAt ?? null,
    totals: run.totals ?? null,
  };
}

const status = {
  project: cwd,
  agents,
  catalog: catalogInfo,
  credentials,
  lastRun,
};

if (flags.has("--json")) {
  process.stdout.write(JSON.stringify(status, null, 2));
  process.exit(0);
}

const tick = (ok) => (ok ? "✓" : "✗");
const out = [];
out.push("QA Catalog Status");
out.push("=================");
out.push("");

out.push("  Browser agents (.claude/agents/):");
for (const [name, present] of Object.entries(agents)) {
  out.push(`  ${tick(present)} ${name}.md${present ? "" : "  — run /qa-catalog:init to install"}`);
}
out.push("");

if (!catalogInfo) {
  out.push("  Catalog:");
  out.push("  ✗ QA-tests/catalog.json missing — run /qa-catalog:init to bootstrap");
} else {
  out.push(`  Catalog (v${catalogInfo.version ?? "?"}):`);
  out.push(`  ✓ framework: ${catalogInfo.framework ?? "unknown"}`);
  out.push(`  ✓ dev URL: ${catalogInfo.devUrl ?? "—"}`);
  out.push(
    `  ✓ ${catalogInfo.routes} route(s) (${catalogInfo.protected} protected, ${catalogInfo.roleRestricted} role-restricted)`,
  );
  out.push(`  ✓ ${catalogInfo.tasks} task(s) authored`);
  if (catalogInfo.generatedAt) out.push(`    generated: ${catalogInfo.generatedAt}`);
}
out.push("");

const integrations = catalogInfo?.integrations ?? {};
if (Object.keys(integrations).length > 0) {
  out.push("  Issue trackers:");
  for (const [name, cfg] of Object.entries(integrations)) {
    const enabled = !!cfg?.enabled;
    out.push(`  ${enabled ? "✓" : "-"} ${name}${enabled ? ` (${cfg.mcpServer ?? "connected"})` : " (disabled)"}`);
  }
  out.push("");
}

if (credentials) {
  out.push("  Per-role credentials (QA-tests/.qa-catalog/auth.local.json):");
  for (const [name, r] of Object.entries(credentials.roles)) {
    const detail = r.resolved
      ? r.authMode
      : `${r.authMode} — missing ${r.missing.join(", ") || "credentials"}`;
    out.push(`  ${tick(r.resolved)} ${name}: ${detail}`);
  }
  out.push("");
}

out.push("  Last run:");
if (!lastRun) {
  out.push("  - none yet — run /qa-catalog:run-all or /qa-catalog:run <task>");
} else {
  const t = lastRun.totals ?? {};
  out.push(
    `  ✓ ${lastRun.runId ?? "?"} — ${t.pass ?? 0} pass / ${t.fail ?? 0} fail / ${t.blocked ?? 0} blocked (${t.tasks ?? 0} tasks)`,
  );
  if (lastRun.finishedAt) out.push(`    finished: ${lastRun.finishedAt}`);
}

process.stdout.write(out.join("\n") + "\n");
