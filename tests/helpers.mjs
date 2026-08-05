// Shared fixtures for the script test suite.
//
// Every script under scripts/ resolves the project root from CLAUDE_PROJECT_DIR,
// which makes them black-box testable: build a throwaway project tree, point the
// env var at it, run the script as a subprocess, assert on stdout + exit code.
//
// Pure stdlib, same as the scripts themselves — no test framework to install.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SCRIPTS = resolve(HERE, "..", "scripts");

/** Create a temp project dir. Returns { dir, file, json, cleanup }. */
export function project() {
  const dir = mkdtempSync(join(tmpdir(), "qa-my-app-test-"));
  const file = (rel, contents) => {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contents);
    return abs;
  };
  return {
    dir,
    file,
    json: (rel, obj) => file(rel, JSON.stringify(obj, null, 2)),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

/**
 * Run a script against a project dir.
 * Never throws on a non-zero exit — returns { status, stdout, stderr } so tests
 * can assert on exit codes, which several scripts use as their real signal.
 */
export function run(script, args = [], { cwd, env = {} } = {}) {
  try {
    const stdout = execFileSync("node", [join(SCRIPTS, script), ...args], {
      cwd,
      env: { ...process.env, CLAUDE_PROJECT_DIR: cwd, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (err) {
    return {
      status: err.status ?? 1,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
    };
  }
}

/** Run a script and JSON.parse its stdout, with a readable failure message. */
export function runJson(script, args, opts) {
  const r = run(script, args, opts);
  try {
    return { ...r, json: JSON.parse(r.stdout) };
  } catch {
    throw new Error(
      `${script} did not emit valid JSON.\nexit=${r.status}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`,
    );
  }
}

/** A minimal result.md that satisfies every rule in verify-result.mjs. */
export function validResultMd(overrides = {}) {
  const f = {
    result: "PASS",
    taskFile: "QA-tests/tasks/T01-home-smoke.md",
    route: "/",
    date: "2026-08-05",
    runId: "run-2026-08-05-0900",
    duration: "12",
    screenshots: "0",
    consoleErrors: "0",
    networkFailures: "0",
    tcs: "### TC-01: loads — PASS",
    defects: "- none",
    ...overrides,
  };
  return `# Result — T01

| Field | Value |
|---|---|
| Result | ${f.result} |
| Task file | ${f.taskFile} |
| Route | ${f.route} |
| Date (UTC) | ${f.date} |
| Run id | ${f.runId} |
| Duration (s) | ${f.duration} |
| Screenshots | ${f.screenshots} |
| Console errors | ${f.consoleErrors} |
| Network failures | ${f.networkFailures} |

## Test Case Results

${f.tcs}

## Defects Found

${f.defects}
`;
}
