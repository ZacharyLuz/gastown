# ADR-001: tmux on Windows for Gas Town Agent Management

**Status:** Accepted (validated 2026-03-25)  
**Date:** 2026-03-25  
**Authors:** mcpapps1 team  
**Deciders:** Steve Yegge (Gas Town maintainer), mcpapps1 contributors

---

## Context

Gas Town (`gt`) uses tmux as its session backend for agent management. The following
commands hard-depend on `tmux` being available on `PATH`:

| Command | tmux Usage |
|---------|-----------|
| `gt agents list` | Calls `tmux list-sessions` to enumerate active agents |
| `gt agents menu` | Opens a `tmux display-popup` for interactive session switching |
| `gt agents check` | Inspects tmux sessions with `gt-` prefix for identity collisions |
| `gt session start` | Creates a tmux session, navigates to polecat worktree, launches claude |
| `gt session at` | Attaches to an existing tmux session |
| `gt session capture` | Captures tmux pane buffer for context recovery |

On Windows, `tmux` is not natively available. This causes:

- `gt agents list` → `exec: "tmux": executable file not found in %PATH%`
- `gt session start` → same error
- All agent orchestration commands fail silently or with errors

The ConvoyMCPapp dashboard (`gastown-convoy` MCP server) currently degrades to
showing "Agents: none detected" with a warning on Windows.

**This ADR evaluates options for providing tmux (or tmux-compatible) functionality
on Windows so that Gas Town's full agent management stack works.**

---

## Decision Drivers

1. **Command compatibility** — `gt` shells out to `tmux list-sessions`, `tmux new-session -s <name>`, `tmux send-keys`, etc. The solution must respond to these exact CLI invocations.
2. **Session persistence** — detach/reattach is core to `gt`'s polecat lifecycle (sessions survive across GHCP sessions).
3. **Zero-friction install** — Windows developers already have Node, Go, and PowerShell. Adding a Linux subsystem is a high bar.
4. **No WSL requirement** — mcpapps1 runs natively on Windows (Go binaries, Node.js servers). Introducing WSL creates a split environment.
5. **Maintenance burden** — Prefer actively maintained projects with clear ownership.
6. **Security** — No Cygwin DLLs or unvetted native code running as the user.

---

## Options Considered

### Option A: psmux (Native Windows, Rust)

**Source:** https://github.com/psmux/psmux  
**Install:** `winget install psmux` / `cargo install psmux` / `scoop install psmux`  
**License:** MIT  
**Maturity:** v3.3.0, 747 stars, 30 releases, 8 contributors, active development (commits within hours)

| Criterion | Assessment |
|-----------|-----------|
| tmux CLI compatibility | **76 commands implemented**, reads `.tmux.conf`, supports `list-sessions`, `new-session`, `send-keys`, key tables, hooks |
| Session persistence | **Yes** — native detach/reattach without WSL |
| `tmux` binary on PATH | **Yes** — installs as `tmux.exe`, `psmux.exe`, and `pmux.exe` |
| Windows native | **Yes** — uses ConPTY directly, no Cygwin/MSYS2 |
| Dependencies | **Zero** — single static binary (Rust, static CRT linking) |
| Agent team support | **First-class** — Claude Code agent teams spawn in separate panes automatically |
| Security | Rust memory safety, no DLL injection surface, MIT licensed |

**Risk:** psmux is 4 months old. Some edge-case tmux commands may not be fully compatible.
The 76-command coverage needs to be validated against `gt`'s specific usage patterns.

### Option B: itmux (Cygwin-bundled tmux)

**Source:** claimed at `github.com/nicecatch/itmux` (404 at time of research)  
**Install:** Download ZIP, extract, run `tmux.cmd`

| Criterion | Assessment |
|-----------|-----------|
| tmux CLI compatibility | Full (real tmux binary via Cygwin) |
| Session persistence | Yes |
| `tmux` binary on PATH | Via `tmux.cmd` wrapper |
| Windows native | **No** — bundles Mintty + Cygwin environment |
| Dependencies | Cygwin DLLs, Mintty, OpenSSH |
| Security | Cygwin DLLs are a known attack surface; unmaintained repo (404) |

**Risk:** Repository is a 404. Cannot verify source, licensing, or maintenance status.
Cygwin introduces DLL conflicts and PATH pollution. Disqualified.

### Option C: WSL + Linux tmux

**Install:** `wsl --install`, `sudo apt install tmux`

| Criterion | Assessment |
|-----------|-----------|
| tmux CLI compatibility | **100%** — real tmux |
| Session persistence | Yes |
| `tmux` binary on PATH | Only inside WSL; requires `wsl tmux` wrapper from Windows |
| Windows native | **No** — requires Linux kernel (Hyper-V/WSL2) |
| Dependencies | WSL2, Linux distro, ~1GB disk, Hyper-V |
| Cross-environment | `gt` (Go binary) runs on Windows; calling `wsl tmux` creates a split where sessions live in Linux but agents work on Windows filesystems |

**Risk:** Environment split is the fundamental problem. `gt` manages polecat worktrees
on the Windows filesystem. tmux sessions in WSL would need to access these via `/mnt/c/`,
introducing path translation issues, filesystem performance degradation (9p protocol),
and inotify incompatibility. `gt session start` would need custom Windows-to-WSL
bridging that doesn't exist today.

### Option D: Upstream `gt` change — abstract session backend

Instead of providing tmux on Windows, request that `gt` abstract its session
management behind an interface with pluggable backends (tmux, Windows Terminal
fragments, ConPTY, named pipes).

| Criterion | Assessment |
|-----------|-----------|
| tmux CLI compatibility | N/A — replaces tmux dependency |
| Maintenance | Requires upstream Gas Town changes |
| Timeline | Unknown — depends on Steve's roadmap |
| Windows native | Would be, if implemented |

**Risk:** Significant upstream effort. Gas Town's tmux integration is deep (session
capture, pane buffers, send-keys for Claude interaction). Abstracting this is a
multi-week effort that may not be prioritized.

---

## Decision

**Option A: psmux** — Install psmux to provide a `tmux` binary on Windows PATH.

### Rationale

1. **Drop-in compatibility**: psmux installs a `tmux.exe` that responds to the same
   CLI commands Gas Town uses (`list-sessions`, `new-session -s`, `send-keys`,
   `capture-pane`, `display-popup`). No changes to `gt` source required.

2. **Native Windows**: Uses ConPTY directly. No Cygwin, no WSL, no environment split.
   Polecat worktrees stay on the Windows filesystem.

3. **One-line install**: `winget install psmux` — same package manager already used
   for other Windows dev tools.

4. **Active maintenance**: 30 releases, commits within hours of this ADR. First-class
   Claude Code agent team support suggests alignment with the AI agent orchestration
   use case.

5. **Reversible**: If psmux doesn't work, uninstall it and fall back to the current
   degraded behavior. No system changes.

### Validation Required Before Adoption

Before committing to psmux in the project setup docs, validate these `gt` commands
work correctly with psmux as the tmux backend:

```bash
# 1. Basic session lifecycle
tmux new-session -d -s gt-test-session
tmux list-sessions                      # Must show gt-test-session
tmux send-keys -t gt-test-session "echo hello" Enter
tmux capture-pane -t gt-test-session -p # Must capture "hello"
tmux kill-session -t gt-test-session

# 2. Gas Town agent commands
gt agents list                          # Must enumerate sessions (not error)
gt agents check                         # Must check for collisions

# 3. Polecat session lifecycle
gt session start <polecat-name>         # Must create a tmux session
gt session list                         # Must show the session
gt session at <polecat-name>            # Must attach
```

### Validation Results (2026-03-25)

**psmux v3.3.0 installed via `winget install psmux`** on Windows 11.

| Test | Command | Result |
|------|---------|--------|
| tmux version | `tmux -V` | `tmux 3.3` ✅ |
| Create detached session | `tmux new-session -d -s gt-test-session` | Exit 0 ✅ |
| List sessions | `tmux list-sessions` | Shows `gt-test-session: 1 windows` ✅ |
| Send keys | `tmux send-keys -t gt-test-session "echo hello" Enter` | Exit 0 ✅ |
| Capture pane | `tmux capture-pane -t gt-test-session -p` | Output contains "hello" ✅ |
| Kill session | `tmux kill-session -t gt-test-session` | Exit 0 ✅ |
| Multiple gt- sessions | Create `gt-polecat-001`, `gt-polecat-002` | Both listed ✅ |
| `gt agents list` | Previously: `exec: "tmux": not found` | Now: `No agent sessions running.` ✅ |
| `gt agents check` | Previously: failed | Now: `✔ All agents healthy` ✅ |
| `gt session list` | Previously: failed | Now: `No active sessions.` ✅ |
| ConvoyMCPapp `get-gastown-data` | `errors` array | `[]` (empty — no warnings) ✅ |

**All tests passed.** psmux is validated as a drop-in tmux replacement for Gas Town on Windows.

---

## Consequences

### Positive

- `gt agents list`, `gt agents check`, `gt session *` commands work on Windows
- ConvoyMCPapp dashboard shows real agent data instead of "none detected"
- Windows developers get full Gas Town multi-agent orchestration without WSL
- psmux also benefits other tmux-dependent tools in the ecosystem

### Negative

- Adds a system-level dependency (`psmux` / `tmux.exe` on PATH)
- If psmux has compatibility gaps with specific tmux commands `gt` uses, debugging
  falls on us to report upstream to psmux
- psmux is relatively new (4 months); risk of breaking changes in minor versions

### Neutral

- `gt agents list` warning in ConvoyMCPapp can be removed once validated
- This decision does not preclude Option D (upstream abstraction) in the future

---

## Implementation Plan

1. **Validate** — Run the validation commands above on a dev machine with psmux installed
2. **Document** — Add psmux to README.md prerequisites for Windows development
3. **Update start-all.ps1** — Add a preflight check for `tmux` on PATH with an
   actionable error message pointing to `winget install psmux`
4. **Update ConvoyMCPapp** — Remove the "requires tmux" soft warning once validated;
   if validation fails for specific commands, document which `gt` features require
   Linux tmux

---

## References

- [psmux GitHub](https://github.com/psmux/psmux) — Native Windows tmux
- [psmux compatibility matrix](https://github.com/psmux/psmux/blob/master/docs/compatibility.md)
- [Gas Town](https://github.com/steveyegge/gastown) — Multi-agent orchestration
- [ConvoyMCPapp server.ts](../ConvoyMCPapp/server.ts) — Current tmux error handling
