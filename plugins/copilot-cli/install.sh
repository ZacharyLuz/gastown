#!/usr/bin/env bash
# Gas Town — Copilot CLI integration installer
# Installs skill, custom agent, and MCP server config for GitHub Copilot CLI.
#
# Usage:
#   bash install.sh           # Install to ~/.copilot/
#   bash install.sh --check   # Verify installation

set -euo pipefail

COPILOT_HOME="${COPILOT_HOME:-$HOME/.copilot}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }

# ── Check mode ──────────────────────────────────────────────────
if [[ "${1:-}" == "--check" ]]; then
    echo "Gas Town — Copilot CLI integration check"
    echo ""
    errors=0

    # gt CLI
    if command -v gt &>/dev/null; then
        ok "gt CLI found: $(which gt)"
    else
        err "gt CLI not found on PATH"
        ((errors++))
    fi

    # copilot CLI
    if command -v copilot &>/dev/null; then
        ok "copilot CLI found: $(which copilot)"
    else
        err "copilot CLI not found on PATH"
        ((errors++))
    fi

    # Skill
    if [[ -f "$COPILOT_HOME/skills/gastown/SKILL.md" ]]; then
        ok "Skill installed: $COPILOT_HOME/skills/gastown/"
    else
        err "Skill not installed"
        ((errors++))
    fi

    # Agent
    if [[ -f "$COPILOT_HOME/agents/gastown-crew.md" ]]; then
        ok "Agent profile installed: $COPILOT_HOME/agents/gastown-crew.md"
    else
        err "Agent profile not installed"
        ((errors++))
    fi

    # MCP config
    if [[ -f "$COPILOT_HOME/mcp-config.json" ]] && grep -q "gastown-hooks" "$COPILOT_HOME/mcp-config.json" 2>/dev/null; then
        ok "MCP server registered in mcp-config.json"
    else
        warn "MCP server not registered (optional — needed for MCP tools)"
    fi

    echo ""
    if [[ $errors -eq 0 ]]; then
        ok "All checks passed"
    else
        err "$errors check(s) failed"
        exit 1
    fi
    exit 0
fi

# ── Install ─────────────────────────────────────────────────────
echo "Gas Town — Installing Copilot CLI integration"
echo "  Target: $COPILOT_HOME"
echo ""

# 1. Skill
mkdir -p "$COPILOT_HOME/skills/gastown/references"
cp "$SCRIPT_DIR/skills/gastown/SKILL.md" "$COPILOT_HOME/skills/gastown/"
cp "$SCRIPT_DIR/skills/gastown/references/"*.md "$COPILOT_HOME/skills/gastown/references/"
ok "Skill installed → $COPILOT_HOME/skills/gastown/"

# 2. Agent profile
mkdir -p "$COPILOT_HOME/agents"
cp "$SCRIPT_DIR/agents/gastown-crew.md" "$COPILOT_HOME/agents/"
ok "Agent profile installed → $COPILOT_HOME/agents/gastown-crew.md"

# 3. MCP config (merge, don't overwrite)
MCP_CONFIG="$COPILOT_HOME/mcp-config.json"
if [[ -f "$MCP_CONFIG" ]]; then
    if grep -q "gastown-hooks" "$MCP_CONFIG" 2>/dev/null; then
        ok "MCP server already registered in mcp-config.json"
    else
        warn "MCP config exists — add gastown-hooks manually from:"
        echo "    $SCRIPT_DIR/mcp-config-fragment.json"
    fi
else
    cp "$SCRIPT_DIR/mcp-config-fragment.json" "$MCP_CONFIG"
    ok "MCP config created → $MCP_CONFIG"
fi

echo ""
ok "Installation complete!"
echo ""
echo "  Usage:"
echo "    copilot                           # Interactive session with Gas Town skill"
echo "    copilot --agent=gastown-crew      # Launch as Gas Town polecat"
echo "    copilot -p 'gt bd ready' --yolo   # Quick check for ready work"
echo ""
echo "  Verify: bash $0 --check"
