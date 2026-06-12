#!/usr/bin/env node
// Resolves the set of catalog routes/tasks affected by a change, for /qa-catalog:verify.
// Maps changed source files onto catalog.routes[].sourceFile (and layoutChain) and
// returns the routes + their tasks to (re)author and run.
//
// Sources of "changed files":
//   (default)         git working-tree changes vs HEAD (staged + unstaged + untracked)
//   --staged          only staged changes (git diff --cached)
//   --branch <base>   committed + working changes vs <base> (e.g. main); base defaults to the repo's main branch
//   --files a,b,c     explicit comma/space-separated file list (skips git)
//
// Output: a single JSON object to stdout:
//   {
//     "changedFiles": ["app/customers/page.tsx", ...],
//     "affectedRoutes": [{ "path": "/customers", "sourceFile": "...", "tasks": ["T01-..."], "reason": "source" }],
//     "unmatched": ["lib/utils.ts"],          // changed files not tied to any cataloged route
//     "noCatalog": false
//   }
//
// Pure Node + git. Never executes app code.

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const argv = process.argv.slice(2);

function argValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}

const catalogPath = join(cwd, "QA-tests", "catalog.json");

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

if (!existsSync(catalogPath)) {
  emit({ changedFiles: [], affectedRoutes: [], unmatched: [], noCatalog: true });
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function git(args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8" });
  } catch {
    return "";
  }
}

// Normalize a git path to forward slashes (catalog stores forward-slash paths).
const norm = (p) => p.trim().replace(/\\/g, "/");

function changedFiles() {
  const explicit = argValue("--files");
  if (explicit) {
    return explicit.split(/[,\s]+/).map(norm).filter(Boolean);
  }

  if (argv.includes("--staged")) {
    return git(["diff", "--cached", "--name-only"]).split("\n").map(norm).filter(Boolean);
  }

  if (argv.includes("--branch")) {
    let base = argValue("--branch");
    if (!base || base.startsWith("--")) {
      // Resolve the repo's main branch: origin/HEAD → fallback main → master.
      const head = git(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]).trim();
      base = head || (git(["rev-parse", "--verify", "--quiet", "main"]).trim() ? "main" : "master");
    }
    const committed = git(["diff", "--name-only", `${base}...HEAD`]).split("\n");
    const working = git(["diff", "--name-only", "HEAD"]).split("\n");
    const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
    return [...new Set([...committed, ...working, ...untracked].map(norm).filter(Boolean))];
  }

  // Default: everything dirty vs HEAD (staged + unstaged), plus untracked.
  const tracked = git(["diff", "--name-only", "HEAD"]).split("\n");
  const staged = git(["diff", "--cached", "--name-only"]).split("\n");
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
  return [...new Set([...tracked, ...staged, ...untracked].map(norm).filter(Boolean))];
}

const files = changedFiles();
const fileSet = new Set(files);

const affected = [];
const matched = new Set();

for (const route of catalog.routes ?? []) {
  const src = route.sourceFile ? norm(route.sourceFile) : null;
  const layouts = (route.layoutChain ?? []).map(norm);
  let reason = null;
  if (src && fileSet.has(src)) reason = "source";
  else if (layouts.some((l) => fileSet.has(l))) reason = "layout";
  if (reason) {
    affected.push({
      path: route.path,
      sourceFile: route.sourceFile,
      tasks: route.tasks ?? [],
      reason,
    });
    if (src) matched.add(src);
    layouts.forEach((l) => matched.add(l));
  }
}

const unmatched = files.filter((f) => !matched.has(f));

emit({
  changedFiles: files,
  affectedRoutes: affected,
  unmatched,
  noCatalog: false,
});
