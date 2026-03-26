# Gas Town — Copilot CLI integration installer (PowerShell)
# Installs skill, custom agent, and MCP server config for GitHub Copilot CLI.
#
# Usage:
#   .\install.ps1            # Install to ~/.copilot/
#   .\install.ps1 -Check     # Verify installation
#
# Requires: PowerShell 6+ (cross-platform), copilot CLI v1.0.11+

param(
    [switch]$Check
)

$ErrorActionPreference = "Stop"

# $HOME works on Windows (PS6+), macOS, and Linux; $env:USERPROFILE is Windows-only.
$CopilotHome = if ($env:COPILOT_HOME) { $env:COPILOT_HOME } else { Join-Path $HOME ".copilot" }
$ScriptDir = Split-Path -Parent $PSCommandPath

function Write-Ok($msg)   { Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "⚠ $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "✗ $msg" -ForegroundColor Red }

# ── Check mode ──────────────────────────────────────────────────
if ($Check) {
    Write-Host "Gas Town — Copilot CLI integration check`n"
    $errors = 0

    # gt CLI
    if (Get-Command gt -ErrorAction SilentlyContinue) {
        Write-Ok "gt CLI found: $(Get-Command gt | Select-Object -ExpandProperty Source)"
    } else {
        Write-Err "gt CLI not found on PATH"
        $errors++
    }

    # copilot CLI
    if (Get-Command copilot -ErrorAction SilentlyContinue) {
        $copilotVersion = $null
        try { $copilotVersion = (copilot --version 2>&1) -replace '[^0-9.]','' } catch {}
        Write-Ok "copilot CLI found: $(Get-Command copilot | Select-Object -ExpandProperty Source) ($copilotVersion)"
    } else {
        Write-Err "copilot CLI not found on PATH"
        $errors++
    }

    # Skill
    $skillPath = Join-Path $CopilotHome (Join-Path "skills" (Join-Path "gastown" "SKILL.md"))
    if (Test-Path $skillPath) {
        Write-Ok "Skill installed: $(Split-Path -Parent $skillPath)"
    } else {
        Write-Err "Skill not installed"
        $errors++
    }

    # Agent
    $agentPath = Join-Path $CopilotHome "agents\gastown-crew.md"
    if (Test-Path $agentPath) {
        Write-Ok "Agent profile installed: $agentPath"
    } else {
        Write-Err "Agent profile not installed"
        $errors++
    }

    # MCP config
    $mcpPath = Join-Path $CopilotHome "mcp-config.json"
    if ((Test-Path $mcpPath) -and (Select-String -Path $mcpPath -Pattern "gastown-hooks" -Quiet)) {
        Write-Ok "MCP server registered in mcp-config.json"
    } else {
        Write-Warn "MCP server not registered (optional — needed for MCP tools)"
    }

    Write-Host ""
    if ($errors -eq 0) {
        Write-Ok "All checks passed"
    } else {
        Write-Err "$errors check(s) failed"
        exit 1
    }
    exit 0
}

# ── Install ─────────────────────────────────────────────────────
Write-Host "Gas Town — Installing Copilot CLI integration"
Write-Host "  Target: $CopilotHome`n"

# 1. Skill
$skillGastown = Join-Path $CopilotHome (Join-Path "skills" "gastown")
$skillDir = Join-Path $skillGastown "references"
New-Item -ItemType Directory -Path $skillDir -Force | Out-Null
Copy-Item (Join-Path $ScriptDir (Join-Path "skills" (Join-Path "gastown" "SKILL.md"))) $skillGastown -Force
Get-ChildItem (Join-Path $ScriptDir (Join-Path "skills" (Join-Path "gastown" (Join-Path "references" "*.md")))) | Copy-Item -Destination $skillDir -Force
Write-Ok "Skill installed → $skillGastown"

# 2. Agent profile
$agentDir = Join-Path $CopilotHome "agents"
New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
Copy-Item (Join-Path $ScriptDir (Join-Path "agents" "gastown-crew.md")) $agentDir -Force
Write-Ok "Agent profile installed → $(Join-Path $agentDir 'gastown-crew.md')"

# 3. MCP config (merge, don't overwrite)
$mcpConfig = Join-Path $CopilotHome "mcp-config.json"
if (Test-Path $mcpConfig) {
    if (Select-String -Path $mcpConfig -Pattern "gastown-hooks" -Quiet) {
        Write-Ok "MCP server already registered in mcp-config.json"
    } else {
        Write-Warn "MCP config exists — add gastown-hooks manually from:"
        Write-Host "    $(Join-Path $ScriptDir 'mcp-config-fragment.json')"
    }
} else {
    Copy-Item (Join-Path $ScriptDir "mcp-config-fragment.json") $mcpConfig -Force
    Write-Ok "MCP config created → $mcpConfig"
}

Write-Host ""
Write-Ok "Installation complete!"
Write-Host ""
Write-Host "  Usage:"
Write-Host "    copilot                           # Interactive session with Gas Town skill"
Write-Host "    copilot --agent=gastown-crew      # Launch as Gas Town polecat"
Write-Host "    copilot -p 'gt bd ready' --yolo   # Quick check for ready work"
Write-Host ""
Write-Host "  Verify: .\install.ps1 -Check"
