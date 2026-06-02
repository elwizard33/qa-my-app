#!/usr/bin/env bash
# Installs a pre-commit hook that runs catalog-diff.mjs in --precommit mode,
# blocking commits when QA-tests/catalog.json drifts from the staged source.
# Works on macOS/Linux/Git Bash on Windows.

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOK="$REPO_ROOT/.git/hooks/pre-commit"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$REPO_ROOT/.git/hooks"

cat > "$HOOK" <<'EOF'
#!/usr/bin/env bash
# Auto-installed by qa-catalog Claude Code plugin.
# Verifies QA-tests/catalog.json is in sync with staged source files.
# Bypass with: git commit --no-verify  (not recommended)

if [ ! -f QA-tests/catalog.json ]; then
  exit 0
fi

# Resolve plugin script path. Users can override via QA_CATALOG_PLUGIN_DIR.
PLUGIN_DIR="${QA_CATALOG_PLUGIN_DIR:-}"
if [ -z "$PLUGIN_DIR" ]; then
  # Try common locations
  for candidate in \
    "$HOME/.claude/plugins/qa-catalog" \
    "$HOME/.config/claude/plugins/qa-catalog" \
    "$(git rev-parse --show-toplevel)/.claude/plugins/qa-catalog"; do
    if [ -f "$candidate/scripts/catalog-diff.mjs" ]; then
      PLUGIN_DIR="$candidate"
      break
    fi
  done
fi

if [ -z "$PLUGIN_DIR" ] || [ ! -f "$PLUGIN_DIR/scripts/catalog-diff.mjs" ]; then
  echo "[qa-catalog] pre-commit hook installed but plugin scripts not found; skipping."
  echo "  Set QA_CATALOG_PLUGIN_DIR to the plugin root to enable."
  exit 0
fi

node "$PLUGIN_DIR/scripts/catalog-diff.mjs" --precommit
EOF

chmod +x "$HOOK"
echo "[qa-catalog] installed pre-commit hook at $HOOK"
