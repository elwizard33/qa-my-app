#!/usr/bin/env node
// Maintains the QA-tests/results index after a /qa-my-app:run or /qa-my-app:run-all invocation.
//
// Usage:
//   node results-index.mjs append <runRootAbsOrRelative>
//
// Side effects (all writes are append-only or pointer updates — never destructive):
//   QA-tests/results/history.json           — append one entry per run
//   QA-tests/results/latest.json            — pointer to the most recent run
//   QA-tests/results/by-task/<id>/latest.json — pointer to the most recent run that included <id>
//
// All timestamps are UTC ISO-8601 second precision.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative, basename } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const [, , cmd, runRootArg] = process.argv;

if (cmd !== "append" || !runRootArg) {
  console.error("usage: results-index.mjs append <runRoot>");
  process.exit(2);
}

const runRoot = resolve(cwd, runRootArg);
if (!existsSync(runRoot) || !statSync(runRoot).isDirectory()) {
  console.error(`runRoot not found: ${runRoot}`);
  process.exit(2);
}

const resultsRoot = join(cwd, "QA-tests", "results");
const runsRoot = join(resultsRoot, "runs");
const historyPath = join(resultsRoot, "history.json");
const latestPath = join(resultsRoot, "latest.json");
const byTaskRoot = join(resultsRoot, "by-task");

mkdirSync(resultsRoot, { recursive: true });
mkdirSync(runsRoot, { recursive: true });
mkdirSync(byTaskRoot, { recursive: true });

const runId = basename(runRoot);
const runJsonPath = join(runRoot, "run.json");
const summaryMdPath = join(runRoot, "summary.md");

const runJson = existsSync(runJsonPath) ? JSON.parse(readFileSync(runJsonPath, "utf8")) : { runId, tasks: [] };

// Walk per-task result.md files in the run.
const taskDirs = readdirSync(runRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

function parseResultMd(p) {
  try {
    const txt = readFileSync(p, "utf8");
    const result = /\|\s*Result\s*\|\s*(PASS|FAIL|BLOCKED)\s*\|/i.exec(txt)?.[1]?.toUpperCase() ?? "UNKNOWN";
    const screenshots = Number(/\|\s*Screenshots\s*\|\s*(\d+)\s*\|/i.exec(txt)?.[1] ?? 0);
    const consoleErrors = Number(/\|\s*Console errors\s*\|\s*(\d+)\s*\|/i.exec(txt)?.[1] ?? 0);
    const networkFailures = Number(/\|\s*Network failures\s*\|\s*(\d+)\s*\|/i.exec(txt)?.[1] ?? 0);
    const duration = Number(/\|\s*Duration \(s\)\s*\|\s*(\d+)\s*\|/i.exec(txt)?.[1] ?? 0);
    const route = /\|\s*Route\s*\|\s*([^|]+?)\s*\|/i.exec(txt)?.[1]?.trim() ?? "";
    return { result, screenshots, consoleErrors, networkFailures, duration, route };
  } catch {
    return null;
  }
}

const taskResults = [];
for (const dir of taskDirs) {
  const resMd = join(runRoot, dir, "result.md");
  if (!existsSync(resMd)) continue;
  const parsed = parseResultMd(resMd);
  if (!parsed) continue;
  taskResults.push({
    taskId: dir,
    runId,
    runDir: relative(cwd, join(runRoot, dir)).replaceAll("\\", "/"),
    resultMd: relative(cwd, resMd).replaceAll("\\", "/"),
    summaryMd: existsSync(summaryMdPath) ? relative(cwd, summaryMdPath).replaceAll("\\", "/") : null,
    ...parsed,
  });
}

const summary = {
  runId,
  startedAt: runJson.startedAt ?? null,
  finishedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  filter: runJson.filter ?? null,
  settingsSnapshot: runJson.settingsSnapshot ?? null,
  totals: {
    tasks: taskResults.length,
    pass: taskResults.filter((t) => t.result === "PASS").length,
    fail: taskResults.filter((t) => t.result === "FAIL").length,
    blocked: taskResults.filter((t) => t.result === "BLOCKED").length,
    screenshots: taskResults.reduce((a, t) => a + (t.screenshots || 0), 0),
    consoleErrors: taskResults.reduce((a, t) => a + (t.consoleErrors || 0), 0),
    networkFailures: taskResults.reduce((a, t) => a + (t.networkFailures || 0), 0),
  },
  tasks: taskResults,
};

// Append to history.json
let history = { version: 1, runs: [] };
if (existsSync(historyPath)) {
  try { history = JSON.parse(readFileSync(historyPath, "utf8")); } catch { /* corrupt file — overwrite */ }
}
history.runs.push(summary);
writeFileSync(historyPath, JSON.stringify(history, null, 2));

// Update latest pointer
writeFileSync(latestPath, JSON.stringify({ runId, summaryMd: summary.tasks[0]?.summaryMd ?? null }, null, 2));

// Per-task pointers
for (const t of taskResults) {
  const dir = join(byTaskRoot, t.taskId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "latest.json"),
    JSON.stringify(
      {
        taskId: t.taskId,
        runId: t.runId,
        result: t.result,
        resultMd: t.resultMd,
        screenshots: t.screenshots,
        consoleErrors: t.consoleErrors,
        networkFailures: t.networkFailures,
        duration: t.duration,
        route: t.route,
      },
      null,
      2,
    ),
  );
}

console.log(`[qa-my-app] indexed run ${runId}: ${summary.totals.pass} pass / ${summary.totals.fail} fail / ${summary.totals.blocked} blocked (${summary.totals.tasks} tasks)`);
