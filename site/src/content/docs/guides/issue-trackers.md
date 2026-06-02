---
title: Connecting issue trackers
description: Wire up GitHub, Jira, or Azure DevOps so the runner files defects automatically.
---

The plugin doesn't bundle the GitHub/Jira/ADO MCP servers because they each need user-specific tokens. The init skill walks you through `claude mcp add` for the ones you want at **user scope** (so the same connection works in every repo on your machine). Once connected, the `qa-test-runner` agent can:

- file defects directly as GitHub Issues / Jira tickets / ADO Work Items when a test case fails;
- link each task in `catalog.json` to the issue/epic that requested it;
- attach the run's `summary.md` and per-case screenshots to a PR comment.

You can also wire them up later — the init Phase 1 question is just a convenience. To add them manually any time:

```bash
# GitHub (HTTP MCP, PAT-based)
claude mcp add --transport http --scope user github \
  https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer <YOUR_GITHUB_PAT>"

# Jira / Atlassian (HTTP MCP, OAuth in browser via /mcp)
claude mcp add --transport http --scope user atlassian https://mcp.atlassian.com/v1/sse

# Azure DevOps (stdio MCP, PAT-based)
claude mcp add --transport stdio --scope user ado \
  --env ADO_PAT=<YOUR_ADO_PAT> --env ADO_ORG=<your-org> \
  -- npx -y @azure-devops/mcp-server
```

Verify with `/mcp`. The catalog's `integrations` block records which trackers are wired so the runner knows where to file defects.
