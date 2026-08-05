// detect-framework.mjs is the first thing /qa-my-app:init runs. If it misidentifies
// the framework, route discovery globs the wrong paths and the whole catalog is empty.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { project, runJson } from "./helpers.mjs";

/** Build a project with the given package.json deps plus extra files. */
function withDeps(deps, files = {}) {
  const p = project();
  p.json("package.json", { name: "fixture", dependencies: deps });
  for (const [rel, contents] of Object.entries(files)) p.file(rel, contents);
  return p;
}

describe("detect-framework.mjs", () => {
  test("always emits parseable JSON, even in an empty directory", () => {
    const p = project();
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.equal(typeof json, "object");
    assert.ok(json !== null);
    p.cleanup();
  });

  test("detects Next.js app router", () => {
    const p = withDeps({ next: "15.0.0", react: "19.0.0" }, { "app/page.tsx": "export default () => null" });
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.match(JSON.stringify(json), /next/i);
    p.cleanup();
  });

  test("detects Angular", () => {
    const p = withDeps({ "@angular/core": "19.0.0" }, { "angular.json": "{}" });
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.match(JSON.stringify(json), /angular/i);
    p.cleanup();
  });

  test("detects SvelteKit", () => {
    const p = withDeps({ "@sveltejs/kit": "2.0.0" }, { "svelte.config.js": "export default {}" });
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.match(JSON.stringify(json), /svelte/i);
    p.cleanup();
  });

  test("reports TypeScript in the stack when tsconfig is present", () => {
    const p = withDeps({ typescript: "5.0.0" }, { "tsconfig.json": "{}" });
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.ok(
      JSON.stringify(json.stack ?? json).includes("typescript"),
      "the test-author reads stack.languages to know which source files to open",
    );
    p.cleanup();
  });

  test("surfaces a validation library so the author can read real rules", () => {
    const p = withDeps({ next: "15.0.0", zod: "3.23.0" });
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.match(JSON.stringify(json), /zod/i);
    p.cleanup();
  });

  test("does not crash on a malformed package.json", () => {
    const p = project();
    p.file("package.json", "{ this is not json");
    const { json } = runJson("detect-framework.mjs", [], { cwd: p.dir });
    assert.equal(typeof json, "object", "init must degrade gracefully, not abort");
    p.cleanup();
  });
});
