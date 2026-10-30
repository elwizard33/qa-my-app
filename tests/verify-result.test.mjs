// verify-result.mjs is the gate between "a runner claimed it finished" and
// "the supervisor marks the task done". If it accepts a malformed or
// self-contradictory result, a failing test can be reported as green.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { project, run, runJson, validResultMd } from "./helpers.mjs";

/** Write a task dir containing result.md, return its path. */
function taskDir(p, md, taskId = "T01-home-smoke") {
  p.file(`run/${taskId}/result.md`, md);
  return `run/${taskId}`;
}

describe("verify-result.mjs", () => {
  test("accepts a well-formed PASS result", () => {
    const p = project();
    const dir = taskDir(p, validResultMd());
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true, `unexpected issues: ${JSON.stringify(json.issues)}`);
    assert.equal(status, 0);
    assert.equal(json.taskId, "T01-home-smoke");
    assert.equal(json.parsed.result, "PASS");
    assert.equal(json.parsed.tcCount, 1);
    assert.equal(json.parsed.passCount, 1);
    p.cleanup();
  });

  test("rejects a missing result.md", () => {
    const p = project();
    p.file("run/T02-empty/.keep", "");
    const { json, status } = runJson("verify-result.mjs", ["run/T02-empty"], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.includes("result.md missing"));
    assert.equal(status, 1);
    p.cleanup();
  });

  test("rejects a missing target argument", () => {
    const p = project();
    const { json, status } = runJson("verify-result.mjs", [], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.equal(status, 1);
    p.cleanup();
  });

  test("catches the contradiction: top-level PASS with a failing TC", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({
        result: "PASS",
        tcs: "### TC-01: loads — PASS\n\n### TC-02: submits — FAIL",
      }),
    );
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false, "a green run hiding a failed case is the worst failure mode");
    assert.ok(json.issues.some((i) => /PASS but 1 TC\(s\) failed/.test(i)));
    assert.equal(status, 1);
    p.cleanup();
  });

  test("catches the inverse contradiction: all TCs pass but result is FAIL", () => {
    const p = project();
    const dir = taskDir(p, validResultMd({ result: "FAIL", tcs: "### TC-01: loads — PASS", defects: "- none" }));
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /all 1 TCs passed but top-level Result is FAIL/.test(i)));
    p.cleanup();
  });

  test("rejects a result with no TC sections at all", () => {
    const p = project();
    const dir = taskDir(p, validResultMd({ tcs: "(the runner wrote prose instead of TC headers)" }));
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /no `### TC-NN/.test(i)));
    p.cleanup();
  });

  test("rejects an unrecognised top-level verdict", () => {
    const p = project();
    const dir = taskDir(p, validResultMd({ result: "MOSTLY OK" }));
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /expected PASS\|FAIL\|BLOCKED/.test(i)));
    p.cleanup();
  });

  test("rejects a missing header field", () => {
    const p = project();
    const md = validResultMd().replace(/^\| Run id \|.*$/m, "");
    const dir = taskDir(p, md);
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /header field missing: Run id/.test(i)));
    p.cleanup();
  });

  test("catches screenshot references that do not exist on disk", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({
        screenshots: "1",
        tcs: "### TC-01: loads — PASS\n\n![step](TC01-step.png)",
      }),
    );
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false, "an embedded screenshot that 404s makes the report untrustworthy");
    assert.ok(json.issues.some((i) => /screenshot file\(s\) missing on disk/.test(i)));
    p.cleanup();
  });

  test("accepts screenshot references that do exist, and counts them", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({ screenshots: "1", tcs: "### TC-01: loads — PASS\n\n![step](TC01-step.png)" }),
    );
    p.file(`${dir}/TC01-step.png`, "not-a-real-png-but-a-real-file");
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true, `unexpected issues: ${JSON.stringify(json.issues)}`);
    assert.equal(json.parsed.screenshotsOnDisk, 1);
    assert.equal(status, 0);
    p.cleanup();
  });

  test("catches a Screenshots count claimed with no references", () => {
    const p = project();
    const dir = taskDir(p, validResultMd({ screenshots: "3" }));
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /claims 3 but result\.md has no/.test(i)));
    p.cleanup();
  });

  test("a FAIL must name a defect or say 'none' explicitly", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({ result: "FAIL", tcs: "### TC-01: submits — FAIL", defects: "(nothing here)" }),
    );
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false);
    assert.ok(json.issues.some((i) => /Defects Found section has no DEF-\/ERR- ids/.test(i)));
    p.cleanup();
  });

  test("a FAIL with a DEF- id parses that id out", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({
        result: "FAIL",
        tcs: "### TC-01: submits — FAIL",
        defects: "- DEF-042 — submit button does nothing",
      }),
    );
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true, `unexpected issues: ${JSON.stringify(json.issues)}`);
    assert.deepEqual(json.parsed.defects, ["DEF-042"]);
    assert.equal(status, 0);
    p.cleanup();
  });

  test("counts BLOCKED test cases separately", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({
        result: "BLOCKED",
        tcs: "### TC-01: loads — PASS\n\n### TC-02: admin area — BLOCKED",
        defects: "- none",
      }),
    );
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.parsed.blockedCount, 1);
    assert.equal(json.parsed.passCount, 1);
    assert.equal(json.parsed.tcCount, 2);
    p.cleanup();
  });

  test("always emits single-line JSON, even on failure", () => {
    const p = project();
    p.file("run/T09/.keep", "");
    const r = run("verify-result.mjs", ["run/T09"], { cwd: p.dir });
    assert.equal(r.stdout.trim().split("\n").length, 1, "the dispatch loop parses this as one line");
    assert.doesNotThrow(() => JSON.parse(r.stdout));
    p.cleanup();
  });

  // --- F-087: count cross-checks -------------------------------------------

  test("rejects a header claiming more screenshots than result.md embeds", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({ screenshots: "3", tcs: "### TC-01: loads — PASS\n\n![step](TC01-step.png)" }),
    );
    p.file(`${dir}/TC01-step.png`, "x".repeat(2048));
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, false, "an overclaimed screenshot count hides missing evidence");
    assert.ok(json.issues.some((i) => /claims 3 but result\.md embeds only 1/.test(i)), JSON.stringify(json.issues));
    assert.ok(json.issues.some((i) => /only 1 image file\(s\) exist on disk/.test(i)), JSON.stringify(json.issues));
    assert.equal(status, 1);
    p.cleanup();
  });

  // --- F-087: suspicious-verdict warnings (non-blocking) --------------------

  test("warns — but stays valid — when a PASS carries console errors", () => {
    const p = project();
    const dir = taskDir(p, validResultMd({ consoleErrors: "2" }));
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true, "warnings must never block the dispatch queue by themselves");
    assert.ok(json.warnings.some((w) => /PASS with 2 console error/.test(w)), JSON.stringify(json.warnings));
    assert.equal(status, 0);
    p.cleanup();
  });

  test("warns when every embedded screenshot is byte-identical", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({
        screenshots: "3",
        tcs: "### TC-01: loads — PASS\n\n![a](TC01-a.png)\n\n![b](TC01-b.png)\n\n![c](TC01-c.png)",
      }),
    );
    p.file(`${dir}/TC01-a.png`, "same-bytes");
    p.file(`${dir}/TC01-b.png`, "same-bytes");
    p.file(`${dir}/TC01-c.png`, "same-bytes");
    const { json } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true);
    assert.ok(json.warnings.some((w) => /byte-identical/.test(w)), JSON.stringify(json.warnings));
    p.cleanup();
  });

  test("warns on a suspiciously small (likely blank) screenshot", () => {
    const p = project();
    const dir = taskDir(
      p,
      validResultMd({ screenshots: "1", tcs: "### TC-01: loads — PASS\n\n![step](TC01-step.png)" }),
    );
    p.file(`${dir}/TC01-step.png`, "x");
    const { json, status } = runJson("verify-result.mjs", [dir], { cwd: p.dir });
    assert.equal(json.valid, true, "file exists — evidence quality is a warning, not a schema failure");
    assert.ok(json.warnings.some((w) => /suspiciously small/.test(w)), JSON.stringify(json.warnings));
    assert.equal(status, 0);
    p.cleanup();
  });

  test("zero-evidence warnings are engine-gated: playwright warns, stagehand does not", () => {
    const pw = project();
    const dirPw = taskDir(pw, validResultMd({ engine: "playwright" }));
    const a = runJson("verify-result.mjs", [dirPw], { cwd: pw.dir });
    assert.equal(a.json.valid, true);
    assert.ok(a.json.warnings.some((w) => /zero screenshots on the playwright/.test(w)), JSON.stringify(a.json.warnings));
    pw.cleanup();

    const sh = project();
    const dirSh = taskDir(sh, validResultMd({ engine: "stagehand" }));
    const b = runJson("verify-result.mjs", [dirSh], { cwd: sh.dir });
    assert.equal(b.json.valid, true);
    assert.ok(!b.json.warnings.some((w) => /zero screenshots/.test(w)), "stagehand cannot capture — no warning");
    sh.cleanup();
  });
});
