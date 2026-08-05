#!/usr/bin/env node
// Render a self-contained, auto-refreshing HTML dashboard for a QA run.
//
// Usage:
//   node render-report.mjs <runRoot>
//
// Inputs (read, never mutated):
//   <runRoot>/task-queue.json  — source of truth for run-all (preferred)
//   <runRoot>/run.json         — run metadata; for /qa-my-app:run (single task) also lists tasks
//   <runRoot>/<taskId>/result.md (optional — parsed if task-queue.json is missing fields)
//
// Output:
//   <runRoot>/report.html      — open with a double-click; meta-refreshes while the run is live
//
// Idempotent. Safe to call after every queue transition AND on historic runs.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(__dirname, "..", "templates", "report.html");
const REFRESH_MS = 3000;

function htmlEscape(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function readJsonSafe(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function parseResultMd(p) {
  if (!existsSync(p)) return null;
  let txt;
  try { txt = readFileSync(p, "utf8"); } catch { return null; }
  const grab = (re) => re.exec(txt)?.[1]?.trim();
  const result = grab(/\|\s*Result\s*\|\s*(PASS|FAIL|BLOCKED)\s*\|/i)?.toUpperCase();
  const screenshots = Number(grab(/\|\s*Screenshots\s*\|\s*(\d+)\s*\|/i) ?? 0);
  const consoleErrors = Number(grab(/\|\s*Console errors\s*\|\s*(\d+)\s*\|/i) ?? 0);
  const networkFailures = Number(grab(/\|\s*Network failures\s*\|\s*(\d+)\s*\|/i) ?? 0);
  const duration = Number(grab(/\|\s*Duration \(s\)\s*\|\s*(\d+)\s*\|/i) ?? 0);
  const route = grab(/\|\s*Route\s*\|\s*([^|]+?)\s*\|/i) || "";
  const tcMatches = [...txt.matchAll(/^###\s+TC-\d+.*?—\s*(PASS|FAIL|BLOCKED)\s*$/gim)];
  let passCount = 0, failCount = 0, blockedCount = 0;
  for (const m of tcMatches) {
    const v = m[1].toUpperCase();
    if (v === "PASS") passCount++;
    else if (v === "FAIL") failCount++;
    else if (v === "BLOCKED") blockedCount++;
  }
  return {
    verdict: result,
    tcCount: tcMatches.length || null,
    passCount, failCount, blockedCount,
    screenshots, consoleErrors, networkFailures,
    duration, route,
  };
}

function loadQueue(runRoot) {
  const qPath = join(runRoot, "task-queue.json");
  if (existsSync(qPath)) {
    const q = readJsonSafe(qPath);
    if (q && Array.isArray(q.tasks)) return q;
  }
  // Fallback: single-task /run flow (no queue). Synthesize one from run.json + result.md.
  const run = readJsonSafe(join(runRoot, "run.json"));
  if (!run || !Array.isArray(run.tasks)) return null;
  const tasks = run.tasks.map((t) => {
    const taskId = t.taskId;
    const parsed = parseResultMd(join(runRoot, taskId, "result.md"));
    const hasResult = parsed && parsed.verdict;
    return {
      taskId,
      taskFile: t.taskFile || null,
      route: parsed?.route || t.route || "",
      status: hasResult ? "complete" : "pending",
      attempt: hasResult ? 1 : 0,
      startedAt: run.startedAt || null,
      finishedAt: hasResult ? (run.finishedAt || null) : null,
      verdict: parsed?.verdict || null,
      tcCount: parsed?.tcCount ?? null,
      passCount: parsed?.passCount ?? null,
      failCount: parsed?.failCount ?? null,
      blockedCount: parsed?.blockedCount ?? null,
      screenshots: parsed?.screenshots ?? null,
      consoleErrors: parsed?.consoleErrors ?? null,
      networkFailures: parsed?.networkFailures ?? null,
      defects: [],
      verificationIssues: [],
    };
  });
  return { runId: run.runId || basename(runRoot), updatedAt: run.startedAt || null, tasks };
}

function fmtDuration(startedAt, finishedAt) {
  if (!startedAt) return "—";
  const start = Date.parse(startedAt);
  const end = finishedAt ? Date.parse(finishedAt) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const sec = Math.round((end - start) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ${s}s`;
}

function badge(text, cls) {
  return `<span class="badge ${cls}">${htmlEscape(text)}</span>`;
}

function statusBadge(s) { return badge(s || "?", s || "pending"); }
function verdictBadge(v) {
  if (!v) return '<span class="dash">—</span>';
  return badge(v, v.toLowerCase());
}

function renderRow(t, runRoot) {
  const route = t.route ? `<code>${htmlEscape(t.route)}</code>` : '<span class="dash">—</span>';
  const status = statusBadge(t.status);
  const verdict = verdictBadge(t.verdict);
  const attempts = t.attempt || 0;
  const tcs = t.tcCount != null
    ? `${t.passCount ?? 0} / ${t.failCount ?? 0} / ${t.blockedCount ?? 0}`
    : '<span class="dash">—</span>';
  const errs = (t.consoleErrors != null || t.networkFailures != null)
    ? `${t.consoleErrors ?? 0} / ${t.networkFailures ?? 0}`
    : '<span class="dash">—</span>';
  const dur = fmtDuration(t.startedAt, t.finishedAt);
  const defectsList = Array.isArray(t.defects) && t.defects.length
    ? t.defects.map((d) => `<code>${htmlEscape(typeof d === "string" ? d : (d.id || d.title || JSON.stringify(d)))}</code>`).join("<br/>")
    : '<span class="dash">—</span>';
  const resultRel = `${t.taskId}/result.md`;
  const link = existsSync(join(runRoot, resultRel))
    ? `<a href="${htmlEscape(resultRel)}">result.md</a>`
    : '<span class="dash">—</span>';
  return `<tr>
      <td><code>${htmlEscape(t.taskId)}</code></td>
      <td>${route}</td>
      <td>${status}</td>
      <td>${verdict}</td>
      <td>${attempts}</td>
      <td>${tcs}</td>
      <td>${errs}</td>
      <td>${htmlEscape(dur)}</td>
      <td>${defectsList}</td>
      <td>${link}</td>
    </tr>`;
}

function uniqueDefects(tasks) {
  const seen = new Map();
  for (const t of tasks) {
    for (const d of t.defects || []) {
      const id = typeof d === "string" ? d : (d.id || d.title || JSON.stringify(d));
      if (!seen.has(id)) seen.set(id, { id, taskId: t.taskId });
    }
  }
  return [...seen.values()];
}

function verificationFailures(tasks) {
  return tasks
    .filter((t) => Array.isArray(t.verificationIssues) && t.verificationIssues.length)
    .map((t) => ({ taskId: t.taskId, attempt: t.attempt, issues: t.verificationIssues }));
}

function render(runRootArg) {
  const runRoot = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd(), runRootArg);
  if (!existsSync(runRoot)) {
    console.error(`render-report: runRoot not found: ${runRoot}`);
    process.exit(1);
  }
  const queue = loadQueue(runRoot);
  if (!queue) {
    console.error(`render-report: no task-queue.json or run.json found in ${runRoot}`);
    process.exit(1);
  }
  const run = readJsonSafe(join(runRoot, "run.json")) || {};
  const tpl = readFileSync(TEMPLATE_PATH, "utf8");

  const tasks = queue.tasks || [];
  const total = tasks.length;
  const by = (pred) => tasks.filter(pred).length;
  const passN = by((t) => t.status === "complete" && t.verdict === "PASS");
  const failN = by((t) => t.status === "complete" && t.verdict === "FAIL");
  const blockedN = by((t) => t.status === "complete" && t.verdict === "BLOCKED");
  const verifFailN = by((t) => t.status === "failed-verification");
  const runningN = by((t) => t.status === "dispatched" || t.status === "verifying");
  const pendingN = by((t) => t.status === "pending");
  const done = runningN + pendingN === 0 && total > 0;

  const pct = (n) => (total ? (100 * n) / total : 0).toFixed(2);

  const rows = tasks.length
    ? tasks.map((t) => renderRow(t, runRoot)).join("\n    ")
    : '<tr><td colspan="10" class="dash" style="text-align:center">no tasks yet</td></tr>';

  const defects = uniqueDefects(tasks);
  const defectsSection = defects.length
    ? `<div class="defects"><h2 style="font-size:1.1rem;margin:1.75rem 0 .25rem">Defects Found</h2><ul>${
        defects.map((d) => `<li><code>${htmlEscape(d.id)}</code> — <code>${htmlEscape(d.taskId)}</code></li>`).join("")
      }</ul></div>`
    : "";

  const verifs = verificationFailures(tasks);
  const verifSection = verifs.length
    ? `<div class="verif"><h2 style="font-size:1.1rem;margin:1.5rem 0 .5rem">Verification failures</h2>${
        verifs.map((v) => `<details><summary><code>${htmlEscape(v.taskId)}</code> — attempt ${v.attempt}</summary><ul>${
          v.issues.map((i) => `<li>${htmlEscape(typeof i === "string" ? i : JSON.stringify(i))}</li>`).join("")
        }</ul></details>`).join("")
      }</div>`
    : "";

  const finishedTs = done
    ? (tasks.map((t) => t.finishedAt).filter(Boolean).sort().slice(-1)[0] || queue.updatedAt || "")
    : (queue.updatedAt || "");
  const finishedLabel = done ? "finished" : "updated";
  const liveStatus = done
    ? `complete — ${fmtDuration(run.startedAt, finishedTs)}`
    : (total === 0 ? "preparing" : `running — ${runningN} in flight, ${pendingN} pending`);

  const fields = {
    runId: htmlEscape(queue.runId || basename(runRoot)),
    refreshMeta: done ? "" : `<meta http-equiv="refresh" content="${Math.round(REFRESH_MS / 1000)}" />`,
    refreshLabel: done ? "off (run complete)" : `every ${Math.round(REFRESH_MS / 1000)}s`,
    liveDotClass: done ? "done" : "",
    liveStatus: htmlEscape(liveStatus),
    startedAt: htmlEscape(run.startedAt || "—"),
    finishedLabel,
    finishedAt: htmlEscape(finishedTs || "—"),
    filter: htmlEscape(run.filter || "—"),
    tasksTotal: String(total),
    tasksPass: String(passN),
    tasksFail: String(failN),
    tasksBlocked: String(blockedN + verifFailN),
    tasksInFlight: String(runningN),
    tasksPending: String(pendingN),
    pctPass: pct(passN),
    pctFail: pct(failN),
    pctBlocked: pct(blockedN),
    pctVerifFail: pct(verifFailN),
    pctRunning: pct(runningN),
    rows,
    defectsSection,
    verifSection,
    autoChecked: done ? "" : "checked",
    doneJs: done ? "true" : "false",
    refreshMs: String(REFRESH_MS),
    generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  };

  let html = tpl;
  for (const [k, v] of Object.entries(fields)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }

  const outPath = join(runRoot, "report.html");
  writeFileSync(outPath, html, "utf8");
  return outPath;
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: render-report.mjs <runRoot>");
  process.exit(2);
}
const out = render(arg);
console.log(`[qa-my-app] rendered ${out}`);
