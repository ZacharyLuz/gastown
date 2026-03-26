---
name: gastown
description: >
  Gas Town multi-agent orchestration for GitHub Copilot CLI.
  Enables Copilot CLI sessions to participate as polecats in Gas Town's
  orchestration system — claim issues, work in worktrees, send mail,
  report done, and recover context across sessions.
  Use when working on Gas Town-managed projects, dispatching work to
  agents, or coordinating multi-agent development workflows.
---

# Gas Town — Copilot CLI Integration

Gas Town is a multi-agent orchestration system that coordinates parallel
agent work across git worktrees. This skill enables GitHub Copilot CLI
to participate as a **polecat** (named worker) in Gas Town's workflow.

## Prerequisites

- `gt` CLI installed and on PATH (`go install github.com/steveyegge/gastown/cmd/gt@latest`)
- `bd` (beads) available for issue tracking (bundled with gt)
- A Gas Town town initialized (`gt init`)

## Quick Reference

### Check for Work
```bash
bd ready                    # List unblocked issues
gt mail inbox               # Check your inbox
```

### Claim and Work
```bash
bd update <id> --claim      # Claim an issue
# ... do the work ...
bd close <id>               # Mark complete
```

### Report Done
```bash
gt done                     # Signal work complete — MANDATORY
```

### Communicate
```bash
gt mail send <recipient> "message"   # Send to another polecat or role
gt nudge <rig>/<polecat> "message"   # Direct message to running agent
gt escalate -s MEDIUM "description"  # Escalate a blocker
```

### Session Recovery
```bash
gt seance                   # List previous sessions
gt seance --talk <id>       # Query a predecessor session
gt prime                    # Reload context after compaction
```

### Issue Tracking (bd / beads)
```bash
bd create --title="title" --type=bug --priority=1
bd create --title="found issue" --priority=2 --deps discovered-from:<parent-id>
bd update <id> --claim
bd close <id>
bd ready                    # Show unblocked work
```

## Polecat Workflow

When operating as a Gas Town polecat:

1. **Start**: Run `gt mail inbox` once at session start
2. **Claim**: Run `bd ready` to find work, then `bd update <id> --claim`
3. **Focus**: Work ONLY on your pinned bead — do not multitask
4. **Discover**: If you find related issues, file them with `bd create` but don't fix them
5. **Quality**: Run tests and linters before marking done
6. **Land**: Commit, push, then run `gt done`
7. **NEVER** end a session without running `gt done`

## Gas Town MCP Tools

If the gastown-hooks MCP server is configured, these tools are available:

| Tool | Purpose |
|------|---------|
| `hook-emit` | Write events to the Gas Town event stream |
| `hook-mail-send` | Send mail to another agent or role |
| `hook-mail-check` | Check your inbox for messages |
| `hook-session-start` | Register session with Gas Town |
| `hook-session-end` | Signal session ending |
| `seance-list` | List discoverable previous sessions |
| `seance-replay` | Query a predecessor session's context |

## References

- [references/polecat-lifecycle.md](references/polecat-lifecycle.md) — Full polecat state machine
- [references/mail-protocol.md](references/mail-protocol.md) — How agent mail routing works
- [references/issue-workflow.md](references/issue-workflow.md) — bd issue lifecycle
- [references/landing-the-plane.md](references/landing-the-plane.md) — Session completion checklist
