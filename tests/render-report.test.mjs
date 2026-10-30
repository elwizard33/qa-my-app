// render-report.mjs turns a run directory into report.html. The screenshot
// gallery (F-088) must surface the actual evidence — thumbnails linked relative
// to report.html — not just the counts the header table carries.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { project, run, validResultMd } from "./helpers.mjs";

/** Standard fixture: a run.json + one task dir with result.md (no queue file). */
function fixture({ md, screenshots = [] }) {
  const p = project();
  p.json("run/run.json", {
    runId: "run-2026-10-30",
    startedAt: "2026-10-30T09:00:00Z",
    filter: "all",
    tasks: [{ taskId: "T01-home-smoke", taskFile: "QA-tests/tasks/T01-home-smoke.md", route: "/" }],
  });
  p.file("run/T01-home-smoke/result.md", md);
  for (const s of screenshots) p.file(`run/T01-home-smoke/${s}`, "png-bytes");
  return p;
}

describe("render-report.mjs", () => {
  test("renders a gallery section linking every embedded screenshot", () => {
    const p = fixture({
      md: validResultMd({
        screenshots: "2",
        tcs: "### TC-01: loads — PASS\n\n![a](TC01-a.png)\n\n![b](TC01-b.png)",
      }),
      screenshots: ["TC01-a.png", "TC01-b.png"],
    });
    const r = run("render-report.mjs", ["run"], { cwd: p.dir });
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(p.dir, "run/report.html"), "utf8");
    assert.ok(html.includes("Screenshot gallery"), "gallery section missing");
    assert.ok(html.includes('src="T01-home-smoke/TC01-a.png"'), "thumbnail 1 not linked");
    assert.ok(html.includes('src="T01-home-smoke/TC01-b.png"'), "thumbnail 2 not linked");
    assert.ok(!html.includes("{{gallerySection}}"), "placeholder not substituted");
    p.cleanup();
  });

  test("omits the gallery entirely when no task embeds screenshots", () => {
    const p = fixture({ md: validResultMd() });
    const r = run("render-report.mjs", ["run"], { cwd: p.dir });
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(p.dir, "run/report.html"), "utf8");
    assert.ok(!html.includes("Screenshot gallery"), "empty gallery heading should not render");
    p.cleanup();
  });

  test("notes referenced screenshots that are missing on disk", () => {
    const p = fixture({
      md: validResultMd({
        screenshots: "1",
        tcs: "### TC-01: loads — PASS\n\n![a](TC01-a.png)",
      }),
      screenshots: [], // referenced but never written
    });
    const r = run("render-report.mjs", ["run"], { cwd: p.dir });
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(p.dir, "run/report.html"), "utf8");
    assert.ok(html.includes("referenced screenshots missing on disk"), "broken evidence must be visible");
    assert.ok(!html.includes('src="T01-home-smoke/TC01-a.png"'), "must not link a file that is not there");
    p.cleanup();
  });
});