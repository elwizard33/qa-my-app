#!/usr/bin/env node
// Computes sha256 fingerprints for the given file paths. Prints JSON: { "<path>": "<sha>" }.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const out = {};

for (const arg of process.argv.slice(2)) {
  try {
    const buf = readFileSync(join(cwd, arg));
    out[arg] = createHash("sha256").update(buf).digest("hex");
  } catch (err) {
    out[arg] = null;
  }
}

process.stdout.write(JSON.stringify(out, null, 2));
