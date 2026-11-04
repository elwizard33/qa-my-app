#!/usr/bin/env node
// PostToolUse hook (Write|Edit). When browser_engine is "stagehand", /qa-my-app:init
// writes a sentinel placeholder into the project-level browser agents' mcpServers block
// instead of a real secret, because Claude Code never substitutes a sensitive userConfig
// value into skill or agent content. CLAUDE_PLUGIN_OPTION_<KEY> is exported to hook
// processes only, so this hook -- not the skill, not Claude -- patches the sentinel with
// the real key. The key never passes through Claude's context.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SENTINEL = "REPLACE_WITH_YOUR_BROWSERBASE_API_KEY";

const key = process.env.CLAUDE_PLUGIN_OPTION_BROWSERBASE_API_KEY;
if (key) {
  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const targets = [
    join(cwd, ".claude", "agents", "qa-page-analyzer.md"),
    join(cwd, ".claude", "agents", "qa-test-runner.md"),
  ];

  for (const path of targets) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    if (content.includes(SENTINEL)) {
      writeFileSync(path, content.split(SENTINEL).join(key));
    }
  }
}
