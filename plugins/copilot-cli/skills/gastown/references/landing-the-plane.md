# Landing the Plane — Session Completion

When ending a work session, ALL steps below are MANDATORY.
Work is NOT complete until `git push` succeeds.

## Checklist

1. **File issues for remaining work**
   ```bash
   bd create --title="remaining item" --description="details" --priority=2 --deps discovered-from:<id>
   ```

2. **Run quality gates** (if code changed)
   ```bash
   npm test        # or language-appropriate test runner
   npm run build   # verify it compiles
   ```

3. **Update issue status**
   ```bash
   bd close <id>
   ```

4. **Push to remote** — THIS IS MANDATORY
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```

5. **Signal done**
   ```bash
   gt done
   ```

## Critical Rules

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing — that leaves work stranded locally
- NEVER say "ready to push when you are" — YOU must push
- If push fails, resolve and retry until it succeeds
- NEVER end a session without running `gt done`
