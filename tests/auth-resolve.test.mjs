// auth-resolve.mjs is the single path every password takes to reach a browser.
// v1.0.0 made it load-bearing for all auth modes (previously only per-role), so a
// regression here silently breaks authenticated testing — or, worse, leaks a secret.

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { project, run, runJson } from "./helpers.mjs";

const AUTH = "QA-tests/.qa-catalog/auth.local.json";

describe("auth-resolve.mjs", () => {
  let p;
  before(() => { p = project(); });
  after(() => p.cleanup());

  test("reports absent credential file without crashing", () => {
    const { json, status } = runJson("auth-resolve.mjs", ["--status", "--json"], { cwd: p.dir });
    assert.equal(json.present, false);
    assert.deepEqual(json.rolesConfigured, []);
    assert.equal(status, 0, "no roles configured is success, not failure");
  });

  test("interpolates ${ENV_VAR} passwords from the environment", () => {
    p.json(AUTH, {
      version: 1,
      defaultRole: "admin",
      roles: {
        admin: {
          authMode: "shared-credentials",
          loginUrl: "/login",
          username: "admin@acme.test",
          password: "${QA_TEST_ADMIN_PW}",
        },
      },
    });
    const { json } = runJson("auth-resolve.mjs", ["--json"], {
      cwd: p.dir,
      env: { QA_TEST_ADMIN_PW: "s3cret-value" },
    });
    assert.equal(json.roles.admin.password, "s3cret-value");
    assert.equal(json.roles.admin.username, "admin@acme.test");
    assert.equal(json.roles.admin.resolved, true);
    assert.deepEqual(json.roles.admin.missing, []);
  });

  test("flags the missing variable by name and exits non-zero", () => {
    const { json, status } = runJson("auth-resolve.mjs", ["--json"], {
      cwd: p.dir,
      env: { QA_TEST_ADMIN_PW: "" },
    });
    assert.equal(json.roles.admin.resolved, false);
    assert.ok(
      json.roles.admin.missing.includes("QA_TEST_ADMIN_PW"),
      "the operator needs the variable NAME to fix it",
    );
    assert.equal(status, 1, "unresolved credentials must fail loudly, not default to empty");
  });

  test("--status never emits a secret", () => {
    const r = run("auth-resolve.mjs", ["--status", "--json"], {
      cwd: p.dir,
      env: { QA_TEST_ADMIN_PW: "s3cret-value" },
    });
    assert.ok(
      !r.stdout.includes("s3cret-value"),
      "redacted mode is used in status reports and CI logs — it must never print a password",
    );
    const json = JSON.parse(r.stdout);
    assert.equal(json.roles.admin.hasUsername, true);
    assert.equal(json.roles.admin.password, undefined);
  });

  test("human-readable default mode is also redacted", () => {
    const r = run("auth-resolve.mjs", [], { cwd: p.dir, env: { QA_TEST_ADMIN_PW: "s3cret-value" } });
    assert.ok(!r.stdout.includes("s3cret-value"));
    assert.match(r.stdout, /admin/);
  });

  test("authMode 'none' resolves without credentials", () => {
    const q = project();
    q.json(AUTH, { version: 1, defaultRole: "anonymous", roles: { anonymous: { authMode: "none" } } });
    const { json, status } = runJson("auth-resolve.mjs", ["--json"], { cwd: q.dir });
    assert.equal(json.roles.anonymous.resolved, true);
    assert.equal(status, 0);
    q.cleanup();
  });

  test("storage-state is unresolved when the session file is absent", () => {
    const q = project();
    q.json(AUTH, {
      version: 1,
      defaultRole: "user",
      roles: { user: { authMode: "storage-state", storageStatePath: ".qa-catalog/state/user.json" } },
    });
    const { json } = runJson("auth-resolve.mjs", ["--json"], { cwd: q.dir });
    assert.equal(json.roles.user.resolved, false, "a missing session file must not read as authenticated");
    assert.ok(json.roles.user.missing.some((m) => m.startsWith("storageState:")));
    q.cleanup();
  });

  test("storage-state resolves once the session file exists", () => {
    const q = project();
    q.json(AUTH, {
      version: 1,
      defaultRole: "user",
      roles: { user: { authMode: "storage-state", storageStatePath: ".qa-catalog/state/user.json" } },
    });
    q.json("QA-tests/.qa-catalog/state/user.json", { cookies: [], origins: [] });
    const { json, status } = runJson("auth-resolve.mjs", ["--json"], { cwd: q.dir });
    assert.equal(json.roles.user.resolved, true);
    assert.equal(status, 0);
    q.cleanup();
  });

  test("--role falls back to defaultRole for an unknown role", () => {
    const q = project();
    q.json(AUTH, { version: 1, defaultRole: "anonymous", roles: { anonymous: { authMode: "none" } } });
    const { json } = runJson("auth-resolve.mjs", ["--role", "does-not-exist", "--json"], { cwd: q.dir });
    assert.equal(json.role, "anonymous");
    q.cleanup();
  });

  test("shared-credentials without a username is unresolved", () => {
    const q = project();
    q.json(AUTH, {
      version: 1,
      defaultRole: "admin",
      roles: { admin: { authMode: "shared-credentials", password: "literal" } },
    });
    const { json } = runJson("auth-resolve.mjs", ["--json"], { cwd: q.dir });
    assert.equal(json.roles.admin.resolved, false);
    q.cleanup();
  });

  test("malformed JSON fails with a pointer to the file, not a stack trace", () => {
    const q = project();
    q.file(AUTH, "{ not valid json");
    const r = run("auth-resolve.mjs", ["--json"], { cwd: q.dir });
    assert.equal(r.status, 1);
    const json = JSON.parse(r.stdout);
    assert.match(json.error, /Invalid JSON/);
    assert.match(json.error, /auth\.local\.json/);
    q.cleanup();
  });
});
