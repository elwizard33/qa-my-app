#!/usr/bin/env node
// Compares source-file SHAs against QA-tests/.qa-catalog/fingerprints.json and emits a drift report.
// Modes:
//   --json           print JSON drift report to stdout (used as context in /qa-my-app:sync)
//   --silent         emit nothing on no drift, short note on drift (for SessionStart/PostToolUse hooks)
//   --notify         print a one-line nudge ("⚠ 2 routes drifted — run /qa-my-app:sync")
//   --precommit      exit 1 if drift detected (used by .git/hooks/pre-commit)
//   --session-start  marker flag (no behavioral change; lets hooks log differently)
//   --post-tool      marker flag

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const flags = new Set(process.argv.slice(2));

const catalogPath = join(cwd, "QA-tests", "catalog.json");
const fpPath = join(cwd, "QA-tests", ".qa-catalog", "fingerprints.json");

if (!existsSync(catalogPath) || !existsSync(fpPath)) {
  if (flags.has("--json")) process.stdout.write('{"stale":[],"removed":[],"added":[],"noCatalog":true}');
  process.exit(0);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const fingerprints = JSON.parse(readFileSync(fpPath, "utf8"));

function sha(path) {
  try {
    const buf = readFileSync(join(cwd, path));
    return createHash("sha256").update(buf).digest("hex");
  } catch { return null; }
}

const stale = [];
const removed = [];

for (const route of catalog.routes ?? []) {
  const src = route.sourceFile;
  const expected = fingerprints[src];
  const actual = sha(src);
  if (actual === null) {
    removed.push({ path: route.path, sourceFile: src });
  } else if (actual !== expected) {
    stale.push({ path: route.path, sourceFile: src, oldFingerprint: expected, newFingerprint: actual });
  }
}

// `added` is left empty here; the authoritative "added routes" list is produced
// by the route-discoverer subagent during /qa-my-app:sync. This script only
// detects drift in already-cataloged files.
const added = [];

const report = { stale, removed, added };

if (flags.has("--json")) {
  process.stdout.write(JSON.stringify(report));
  process.exit(0);
}

const driftCount = stale.length + removed.length;

if (flags.has("--precommit")) {
  if (driftCount > 0) {
    console.error(`\n[qa-my-app] ${driftCount} route(s) drifted from catalog.`);
    console.error(`  stale:   ${stale.map(s => s.path).join(", ") || "-"}`);
    console.error(`  removed: ${removed.map(r => r.path).join(", ") || "-"}`);
    console.error(`Run /qa-my-app:sync inside Claude Code, commit the updated QA-tests/, then retry.`);
    console.error(`(To bypass: 'git commit --no-verify' — not recommended.)\n`);
    process.exit(1);
  }
  process.exit(0);
}

if (driftCount === 0) {
  if (flags.has("--silent")) process.exit(0);
  console.log("[qa-my-app] up to date");
  process.exit(0);
}

if (flags.has("--session-start")) {
  // Inject drift context into Claude's session via hookSpecificOutput.additionalContext
  // per https://code.claude.com/docs/en/hooks#sessionstart-decision-control
  const lines = [`[qa-my-app] ${driftCount} route(s) drifted from the catalog:`];
  for (const s of stale) lines.push(`  ~ ${s.path} (${s.sourceFile})`);
  for (const r of removed) lines.push(`  - ${r.path} (${r.sourceFile})`);
  lines.push(`Suggest running /qa-my-app:sync to reconcile before authoring new tests.`);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: lines.join("\n"),
    },
  }));
  process.exit(0);
}

if (flags.has("--notify") || flags.has("--silent")) {
  console.log(`[qa-my-app] ⚠ ${driftCount} route(s) drifted — run /qa-my-app:sync`);
  process.exit(0);
}

// Default human-readable
console.log(`[qa-my-app] ${driftCount} drift(s) detected:`);
for (const s of stale) console.log(`  ~ ${s.path}  (${s.sourceFile})`);
for (const r of removed) console.log(`  - ${r.path}  (${r.sourceFile})`);
console.log("Run /qa-my-app:sync to reconcile.");
