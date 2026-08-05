// fingerprint.mjs + catalog-diff.mjs are the drift-detection pair: fingerprint
// records a SHA per cataloged source file, catalog-diff compares the current tree
// against that record. Both hooks and the pre-commit guard depend on the exit
// codes and JSON shape here.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { project, run, runJson } from "./helpers.mjs";

const FP = "QA-tests/.qa-catalog/fingerprints.json";
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** A project with one cataloged route whose fingerprint is already recorded. */
function cataloged(contents = "export default function Page(){}") {
  const p = project();
  p.file("app/customers/page.tsx", contents);
  p.json("QA-tests/catalog.json", {
    routes: [{ path: "/customers", sourceFile: "app/customers/page.tsx", tasks: ["T01-customers-list"] }],
  });
  p.json(FP, { "app/customers/page.tsx": sha(contents) });
  return p;
}

describe("fingerprint.mjs", () => {
  test("emits a stable sha256 keyed by the path as given", () => {
    const p = project();
    p.file("app/page.tsx", "hello");
    const { json } = runJson("fingerprint.mjs", ["app/page.tsx"], { cwd: p.dir });
    assert.equal(json["app/page.tsx"], sha("hello"));
    p.cleanup();
  });

  test("is deterministic across runs", () => {
    const p = project();
    p.file("app/page.tsx", "hello");
    const a = runJson("fingerprint.mjs", ["app/page.tsx"], { cwd: p.dir }).json;
    const b = runJson("fingerprint.mjs", ["app/page.tsx"], { cwd: p.dir }).json;
    assert.deepEqual(a, b, "drift detection is meaningless if the hash is unstable");
    p.cleanup();
  });

  test("different content yields a different hash", () => {
    const p = project();
    p.file("a.tsx", "one");
    p.file("b.tsx", "two");
    const { json } = runJson("fingerprint.mjs", ["a.tsx", "b.tsx"], { cwd: p.dir });
    assert.notEqual(json["a.tsx"], json["b.tsx"]);
    p.cleanup();
  });

  test("records null for an unreadable file rather than crashing", () => {
    const p = project();
    const { json } = runJson("fingerprint.mjs", ["does/not/exist.tsx"], { cwd: p.dir });
    assert.equal(json["does/not/exist.tsx"], null);
    p.cleanup();
  });

  test("handles multiple files in one invocation", () => {
    const p = project();
    p.file("a.tsx", "one");
    p.file("b.tsx", "two");
    const { json } = runJson("fingerprint.mjs", ["a.tsx", "b.tsx"], { cwd: p.dir });
    assert.deepEqual(Object.keys(json).sort(), ["a.tsx", "b.tsx"]);
    p.cleanup();
  });
});

describe("catalog-diff.mjs", () => {
  test("reports noCatalog when the project has never been initialised", () => {
    const p = project();
    const { json, status } = runJson("catalog-diff.mjs", ["--json"], { cwd: p.dir });
    assert.equal(json.noCatalog, true);
    assert.equal(status, 0, "an uninitialised project is not an error — hooks run everywhere");
    p.cleanup();
  });

  test("reports no drift when fingerprints match the tree", () => {
    const p = cataloged();
    const { json, status } = runJson("catalog-diff.mjs", ["--json"], { cwd: p.dir });
    assert.deepEqual(json.stale, []);
    assert.deepEqual(json.removed, []);
    assert.equal(status, 0);
    p.cleanup();
  });

  test("detects a changed source file as stale", () => {
    const p = cataloged();
    p.file("app/customers/page.tsx", "export default function Page(){ return <Changed/> }");
    const { json } = runJson("catalog-diff.mjs", ["--json"], { cwd: p.dir });
    assert.equal(json.stale.length, 1);
    assert.equal(json.stale[0].path, "/customers");
    p.cleanup();
  });

  test("detects a deleted source file as removed", () => {
    const p = cataloged();
    rmSync(join(p.dir, "app", "customers", "page.tsx"));
    const { json } = runJson("catalog-diff.mjs", ["--json"], { cwd: p.dir });
    assert.equal(json.removed.length, 1);
    assert.equal(json.removed[0].path, "/customers");
    p.cleanup();
  });

  test("--precommit exits non-zero on drift so the commit is blocked", () => {
    const p = cataloged();
    p.file("app/customers/page.tsx", "changed");
    const r = run("catalog-diff.mjs", ["--precommit"], { cwd: p.dir });
    assert.equal(r.status, 1, "the pre-commit guard depends on this exit code");
    p.cleanup();
  });

  test("--precommit exits zero when the catalog is current", () => {
    const p = cataloged();
    const r = run("catalog-diff.mjs", ["--precommit"], { cwd: p.dir });
    assert.equal(r.status, 0);
    p.cleanup();
  });

  test("--silent prints nothing when there is no drift", () => {
    const p = cataloged();
    const r = run("catalog-diff.mjs", ["--silent"], { cwd: p.dir });
    assert.equal(r.stdout.trim(), "", "a quiet hook must not add noise to every session");
    p.cleanup();
  });

  test("--notify names the drifted route", () => {
    const p = cataloged();
    p.file("app/customers/page.tsx", "changed");
    const r = run("catalog-diff.mjs", ["--notify"], { cwd: p.dir });
    assert.match(r.stdout, /drift|sync/i);
    p.cleanup();
  });
});
