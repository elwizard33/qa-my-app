#!/usr/bin/env node
// Verifies a single test-runner result.md against the canonical schema.
// Called by the /qa-catalog:run-all dispatch loop after a runner reports back,
// so the supervisor can confirm the task was ACTUALLY completed before marking
// it done in the task-queue index.
//
// Usage:
//   node verify-result.mjs <runDir>/<taskId>
// Exits 0 on valid, 1 on invalid. Always prints a single-line JSON verdict to stdout:
//   {"taskId":"T03-...","valid":true,"issues":[],"parsed":{...}}

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const target = process.argv[2];
if (!target) {
  process.stdout.write(JSON.stringify({ valid: false, issues: ["missing target dir argument"] }));
  process.exit(1);
}

const dir = resolve(target);
const taskId = basename(dir);
const issues = [];
const parsed = {
  result: null,
  taskFile: null,
  route: null,
  date: null,
  runId: null,
  durationSec: null,
  tcCount: 0,
  passCount: 0,
  failCount: 0,
  blockedCount: 0,
  screenshotsClaimed: 0,
  screenshotsOnDisk: 0,
  consoleErrors: null,
  networkFailures: null,
  defects: [],
};

const resultPath = join(dir, "result.md");
if (!existsSync(resultPath)) {
  process.stdout.write(JSON.stringify({ taskId, valid: false, issues: ["result.md missing"], parsed }));
  process.exit(1);
}

const md = readFileSync(resultPath, "utf8");

// --- 1. Header table fields (required) ---------------------------------------
const headerFields = {
  Result: /^\|\s*Result\s*\|\s*([^|]+?)\s*\|/m,
  "Task file": /^\|\s*Task file\s*\|\s*([^|]+?)\s*\|/m,
  Route: /^\|\s*Route\s*\|\s*([^|]+?)\s*\|/m,
  "Date \\(UTC\\)": /^\|\s*Date \(UTC\)\s*\|\s*([^|]+?)\s*\|/m,
  "Run id": /^\|\s*Run id\s*\|\s*([^|]+?)\s*\|/m,
  "Duration \\(s\\)": /^\|\s*Duration \(s\)\s*\|\s*([^|]+?)\s*\|/m,
  Screenshots: /^\|\s*Screenshots\s*\|\s*([^|]+?)\s*\|/m,
  "Console errors": /^\|\s*Console errors\s*\|\s*([^|]+?)\s*\|/m,
  "Network failures": /^\|\s*Network failures\s*\|\s*([^|]+?)\s*\|/m,
};
for (const [label, rx] of Object.entries(headerFields)) {
  const m = md.match(rx);
  if (!m) issues.push(`header field missing: ${label.replace(/\\\(/g, "(").replace(/\\\)/g, ")")}`);
}
parsed.result = (md.match(headerFields.Result) || [, null])[1];
parsed.taskFile = (md.match(headerFields["Task file"]) || [, null])[1];
parsed.route = (md.match(headerFields.Route) || [, null])[1];
parsed.date = (md.match(headerFields["Date \\(UTC\\)"]) || [, null])[1];
parsed.runId = (md.match(headerFields["Run id"]) || [, null])[1];
parsed.durationSec = Number((md.match(headerFields["Duration \\(s\\)"]) || [, "0"])[1]) || 0;
parsed.screenshotsClaimed = Number((md.match(headerFields.Screenshots) || [, "0"])[1]) || 0;
parsed.consoleErrors = Number((md.match(headerFields["Console errors"]) || [, "0"])[1]) || 0;
parsed.networkFailures = Number((md.match(headerFields["Network failures"]) || [, "0"])[1]) || 0;

// --- 2. Top-level Result must be PASS|FAIL|BLOCKED ---------------------------
const verdict = (parsed.result || "").toUpperCase();
if (!["PASS", "FAIL", "BLOCKED"].includes(verdict)) {
  issues.push(`top-level Result is "${parsed.result}" (expected PASS|FAIL|BLOCKED)`);
}
parsed.result = verdict || parsed.result;

// --- 3. Per-TC sections: each must end with a verdict suffix -----------------
const tcRegex = /^###\s+(TC-\d+)[^\n]*?—\s*(PASS|FAIL|BLOCKED)\s*$/gim;
const tcs = [...md.matchAll(tcRegex)];
parsed.tcCount = tcs.length;
parsed.passCount = tcs.filter(([, , v]) => v.toUpperCase() === "PASS").length;
parsed.failCount = tcs.filter(([, , v]) => v.toUpperCase() === "FAIL").length;
parsed.blockedCount = tcs.filter(([, , v]) => v.toUpperCase() === "BLOCKED").length;
if (parsed.tcCount === 0) issues.push("no `### TC-NN ... — PASS|FAIL|BLOCKED` headers found");

// --- 4. Verdict consistency: any TC FAIL → top-level should be FAIL/BLOCKED --
if (parsed.failCount > 0 && parsed.result === "PASS") {
  issues.push(`top-level Result is PASS but ${parsed.failCount} TC(s) failed`);
}
if (parsed.tcCount > 0 && parsed.passCount === parsed.tcCount && parsed.result !== "PASS") {
  issues.push(`all ${parsed.tcCount} TCs passed but top-level Result is ${parsed.result}`);
}

// --- 5. Screenshot references resolve to files on disk -----------------------
const imgRegex = /!\[[^\]]*\]\(([^)]+\.(?:png|jpg|jpeg|webp))\)/gi;
const refs = [...md.matchAll(imgRegex)].map((m) => m[1].trim());
const missing = [];
for (const r of refs) {
  // Resolve relative to the result.md location (the runDir/taskId folder)
  const abs = resolve(dir, r);
  if (!existsSync(abs)) missing.push(r);
}
if (missing.length) issues.push(`screenshot file(s) missing on disk: ${missing.join(", ")}`);

// Count actual screenshot files in the task dir
let onDisk = 0;
try {
  for (const e of readdirSync(dir)) {
    if (/\.(png|jpg|jpeg|webp)$/i.test(e)) onDisk++;
  }
} catch { /* ignore */ }
parsed.screenshotsOnDisk = onDisk;

if (parsed.screenshotsClaimed > 0 && refs.length === 0) {
  issues.push(`Screenshots header claims ${parsed.screenshotsClaimed} but result.md has no ![](...) references`);
}

// --- 6. Defects section parsing ----------------------------------------------
const defectsBlock = md.split(/^##\s+Defects Found\s*$/im)[1] || "";
const defectIds = [...defectsBlock.matchAll(/\b(DEF-[A-Za-z0-9._-]+|ERR-[A-Za-z0-9._-]+)\b/g)].map((m) => m[1]);
parsed.defects = [...new Set(defectIds)];
if (parsed.result === "FAIL" && parsed.defects.length === 0 && !/^\s*-\s*none\b/im.test(defectsBlock)) {
  issues.push("Result is FAIL but Defects Found section has no DEF-/ERR- ids and is not explicitly 'None'");
}

// --- 7. Final verdict --------------------------------------------------------
const valid = issues.length === 0;
process.stdout.write(JSON.stringify({ taskId, valid, issues, parsed }));
process.exit(valid ? 0 : 1);
