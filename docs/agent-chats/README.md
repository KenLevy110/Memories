# Agent Chat Transcript Archive

This folder stores exported Cursor Agent chat transcripts (`.jsonl`) so they can be versioned in this repository.

## Policy

Enable [Git hooks](#git-hooks) so transcripts stay versioned with your work:

- **pre-commit** runs a sync (best effort) and **`git add docs/agent-chats`** when files change, so routine commits include updated `.jsonl` archives when Cursor has written new transcripts.
- **pre-push** runs sync again and **blocks the push** if `docs/agent-chats/` is still **dirty** (for example, a new transcript appeared after your last commit). Commit or amend, or use **`SKIP_AGENT_CHAT_SYNC=1`** only in exceptional cases.

## Source

Transcripts are copied from your machine’s Cursor **`agent-transcripts`** directory (`*.jsonl`). **Forks:** do not rely on hard-coded paths—configure once using either method below.

| Mechanism | Details |
| --- | --- |
| **Repo-local (recommended)** | Copy **`scripts/sync-agent-chats.local.env.example`** → **`scripts/sync-agent-chats.local.env`** (gitignored), set **`CURSOR_AGENT_TRANSCRIPTS_DIR=`** to the absolute path to `agent-transcripts`. |
| **Environment** | Set **`CURSOR_AGENT_TRANSCRIPTS_DIR`** in your shell or CI profile. |
| **PowerShell override** | **`-SourceDir`**; **`-Strict`** fails if the folder is missing (otherwise skip with a warning). |

Example `agent-transcripts` path (adjust slug):

```bash
export CURSOR_AGENT_TRANSCRIPTS_DIR="$HOME/.cursor/projects/<your-project-slug>/agent-transcripts"
```

## Refresh archive

From the repository root:

**Windows (PowerShell):**

```powershell
./scripts/sync-agent-chats.ps1
```

**Git Bash / Linux / macOS:**

```bash
bash scripts/sync-agent-chats.sh
```

## Git hooks

One-time setup (run inside this repo):

```bash
git config core.hooksPath .githooks
```

Hooks live in **`.githooks/`**:

| Hook | Behavior |
| --- | --- |
| **pre-commit** | Runs **`scripts/sync-agent-chats.sh`** when `bash` is available, otherwise **`sync-agent-chats.ps1`** via PowerShell; stages **`docs/agent-chats`** if there are changes. |
| **pre-push** | Runs **`scripts/sync-agent-chats.sh`** and **fails** if **`docs/agent-chats/`** is still dirty (commit or amend first). |

Emergency bypass (use sparingly; note in the PR):

```bash
SKIP_AGENT_CHAT_SYNC=1 git commit -m "…"
SKIP_AGENT_CHAT_SYNC=1 git push
```

## Commit

After syncing:

```bash
git add docs/agent-chats scripts/sync-agent-chats.ps1 scripts/sync-agent-chats.sh scripts/sync-agent-chats.local.env.example scripts/check-docs.sh scripts/check-docs.ps1 .githooks
git commit -m "chore: sync agent chat transcripts"
```

## Sensitive data notice

Transcripts can include prompts, code snippets, environment details, and operational notes. **Do not paste production secrets, live URLs with tokens, session cookies, or credentials into agent chats**—they can be copied into `.jsonl` archives. Review changes before commit and redact anything that should not be stored in git history.
