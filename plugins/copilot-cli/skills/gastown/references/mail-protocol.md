# Mail Protocol

Gas Town agents communicate via persistent, git-versioned messages stored
in the `.beads/` directory. Mail is routed by recipient path.

## Routing

| Recipient | Path | Who |
|-----------|------|-----|
| `mayor/` | Mayor inbox | Town-level coordinator |
| `<rig>/witness` | Rig's Witness | Health monitor |
| `<rig>/refinery` | Rig's Refinery | Merge queue |
| `<rig>/<polecat>` | Specific polecat | Named worker |
| `--human` | Human overseer | Escalation target |

## Commands

```bash
# Send mail
gt mail send <recipient> -s "Subject" -m "message"

# View your inbox
gt mail inbox

# Read a specific message
gt mail read <id>
```

## Nudge (Real-Time Delivery)

For urgent messages to running agents, use nudge instead of mail:

```bash
gt nudge <rig>/<polecat> "Check your mail and start working"
```

Nudge has three delivery modes:
- `--mode=immediate` — tmux send-keys (interrupts agent)
- `--mode=queue` — file queue, drained at turn boundary (no interruption)
- `--mode=wait-idle` — wait for idle prompt, then deliver (default)

## Best Practices

- Check mail ONCE at session start — don't poll repeatedly
- Use mail for non-urgent communication
- Use nudge for time-sensitive messages
- Use escalate for blockers that need human intervention
