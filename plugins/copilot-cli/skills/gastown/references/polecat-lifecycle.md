# Polecat Lifecycle

A polecat is Gas Town's unit of work — a named worker with a reusable sandbox.

## States

```
SPAWNED → WORKING → DONE → IDLE
                      ↓
                    STUCK (escalation needed)
```

| State | Description | Tmux Session | Worktree |
|-------|-------------|--------------|----------|
| WORKING | Active session, working on issue | Active | Active |
| IDLE | Work done, session killed, sandbox preserved | None | Preserved |
| DONE | Completed, transitioning to IDLE | Closing | Active |
| STUCK | Agent signals need for help | Active | Active |
| ZOMBIE | Orphaned session, cleanup failed | Orphaned | Stale |

## Assignment Flow

1. `gt sling <bead-id> <rig>` — assign issue to a rig
2. Gas Town reuses an idle polecat OR spawns a fresh one
3. Polecat receives issue context and starts working
4. Polecat runs `gt done` when finished → transitions to IDLE
5. Worktree is preserved for potential reuse

## Critical Rules

- **ONE task per polecat** — never work on unassigned issues
- **Always run `gt done`** — sessions must not end without it
- **File discovered work** — use `bd create --deps discovered-from:<id>`
- **Don't wait for approval** — `gt done` is the final action, not a request

## Respawn Protection

Gas Town has a circuit breaker that prevents infinite retry storms:
- Per-bead respawn tracking limits retry attempts
- If a bead has been respawned too many times, sling is blocked
- Escalate if you hit this: `gt escalate -s HIGH "respawn limit reached"`
