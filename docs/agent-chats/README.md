# Agent Chat Transcript Archive

This folder stores exported Cursor Agent chat transcripts (`.jsonl`) so they can be versioned in this repository.

## Source

Transcripts are copied from:

`C:\Users\Ken Levy\.cursor\projects\c-Users-Ken-Levy-OneDrive-Documents-Business-Ohana-Memories\agent-transcripts`

## Refresh archive

From the repository root, run:

```powershell
./scripts/sync-agent-chats.ps1
```

## Commit

After syncing:

```powershell
git add docs/agent-chats scripts/sync-agent-chats.ps1
git commit -m "Update agent chat transcript archive"
```

## Sensitive data notice

Transcripts can include prompts, code snippets, environment details, and operational notes. Review changes before commit and redact anything that should not be stored in git history.
