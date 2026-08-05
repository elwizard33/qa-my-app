# QA My App — Docs

- [AUDIT.md](AUDIT.md) — single living audit log. Each compliance pass against the Claude Code docs appends a "Pass N" section and amends the master findings index. Finding ids (`F-NNN`) are stable across passes — once assigned, a finding never gets renumbered or removed, only its status changes.

## Run an audit

1. Read every file in `.claude-plugin/`, `hooks/`, `skills/**/SKILL.md`, `agents/*.md`, `scripts/*`.
2. Fetch the latest of these six Claude Code doc pages:
   - https://code.claude.com/docs/en/plugins-reference
   - https://code.claude.com/docs/en/plugins
   - https://code.claude.com/docs/en/skills
   - https://code.claude.com/docs/en/sub-agents
   - https://code.claude.com/docs/en/hooks
   - https://code.claude.com/docs/en/mcp
3. Cross-check every component against the docs. Each check is a finding.
4. For new findings, assign the next free `F-NNN` id (look at the highest id in [AUDIT.md](AUDIT.md) and increment).
5. Apply critical and high-severity fixes in the same pass — don't carry them forward.
6. Append a new "Pass N — YYYY-MM-DD" section to [AUDIT.md](AUDIT.md) and amend the master index table.
7. Run `npx -y @anthropic-ai/claude-code plugin validate . --strict` and record the result in the pass section.
