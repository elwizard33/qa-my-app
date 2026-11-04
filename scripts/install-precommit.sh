#!/usr/bin/env bash
# Installs a pre-commit hook that runs catalog-diff.mjs in --precommit mode,
# blocking commits when QA-tests/catalog.json drifts from the staged source.
# Works on macOS/Linux/Git Bash on Windows.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK="$REPO_ROOT/.git/hooks/pre-commit"
# This script lives at <plugin-root>/scripts/install-precommit.sh, so its own
# parent's parent is the exact plugin installation that is running right now.
# Bake that real, known path into the generated hook instead of guessing
# candidate locations at commit time -- the hook then always runs one
# specific, reviewable file: THIS plugin's own scripts/catalog-diff.mjs.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"

mkdir -p "$REPO_ROOT/.git/hooks"

cat > "$HOOK" <<EOF
#!/usr/bin/env bash
# Auto-installed by the qa-my-app Claude Code plugin at: $PLUGIN_ROOT
# Verifies QA-tests/catalog.json is in sync with staged source files.
# Bypass with: git commit --no-verify  (not recommended)
# If the plugin moves or updates to a new install path, re-run
# /qa-my-app:init (Phase 6) to refresh this hook.

if [ ! -f QA-tests/catalog.json ]; then
  exit 0
fi

if [ ! -f "$PLUGIN_ROOT/scripts/catalog-diff.mjs" ]; then
  echo "[qa-my-app] pre-commit hook installed but the plugin is no longer at $PLUGIN_ROOT; skipping."
  echo "  Re-run /qa-my-app:init to refresh this hook."
  exit 0
fi

node "$PLUGIN_ROOT/scripts/catalog-diff.mjs" --precommit
EOF

chmod +x "$HOOK"
echo "[qa-my-app] installed pre-commit hook at $HOOK (plugin: $PLUGIN_ROOT)"
