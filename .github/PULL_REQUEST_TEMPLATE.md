## Summary

- [ ] Briefly describe what changed.

## Testing

- [ ] Lint and type checks pass locally.
- [ ] Relevant tests pass locally.
- [ ] Bug fix includes a regression test (fails before, passes after).

## Documentation and traceability

- [ ] If behavior, architecture, testing policy, or release gates changed: updated the relevant `docs/` (see **`AGENTS.md` → Documentation alignment** and `.cursor/rules/docs-governance.mdc`).
- [ ] **`docs/implementation-log.md`** (or equivalent) updated when this repo requires ticket-level implementation notes.

## AI agent transcripts

- [ ] Ran **`scripts/sync-agent-chats.ps1`** (Windows) or **`scripts/sync-agent-chats.sh`** (Git Bash / macOS / Linux) and **committed** any updates under **`docs/agent-chats/`**, **or** this PR intentionally has no new agent sessions (`SKIP_AGENT_CHAT_SYNC=1` on push only as an emergency bypass — note why in the PR).
- [ ] Reviewed transcript diffs for **secrets or sensitive operational detail** before committing.

## Risk and rollout

- [ ] Notable risks and rollback notes are documented.
