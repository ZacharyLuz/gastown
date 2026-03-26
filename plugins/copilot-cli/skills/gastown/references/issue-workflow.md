# Issue Workflow (bd / beads)

Gas Town uses `bd` (beads) for all issue tracking. Beads are dependency-aware,
git-friendly, and agent-optimized.

## Issue Types

| Type | Use For |
|------|---------|
| `bug` | Something broken |
| `feature` | New functionality |
| `task` | Work item (tests, docs, refactoring) |
| `epic` | Large feature with subtasks |
| `chore` | Maintenance (dependencies, tooling) |

## Priorities

| Level | Meaning |
|-------|---------|
| 0 | Critical (security, data loss, broken builds) |
| 1 | High (major features, important bugs) |
| 2 | Medium (default) |
| 3 | Low (polish, optimization) |
| 4 | Backlog (future ideas) |

## Workflow

```bash
# Find ready work
bd ready

# Create an issue
bd create --title="title" --description="details" --type=bug --priority=1

# Link discovered work
bd create --title="found bug" --priority=2 --deps discovered-from:<parent-id>

# Claim
bd update <id> --claim

# Complete
bd close <id>
```

## Rules

- Link discovered work with `--deps discovered-from:` dependencies
- Check `bd ready` before asking "what should I work on?"
- Do NOT create markdown TODO lists — use bd for ALL tracking
- Do NOT duplicate tracking systems
