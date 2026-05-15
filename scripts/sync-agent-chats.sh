#!/usr/bin/env bash
# Copy Cursor Agent *.jsonl transcripts into docs/agent-chats for versioning.
# Source: CURSOR_AGENT_TRANSCRIPTS_DIR, scripts/sync-agent-chats.local.env, or auto-discovery (resolve-cursor-transcripts-dir.mjs when node is available).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${REPO_ROOT}/docs/agent-chats"
LOCAL_ENV="${REPO_ROOT}/scripts/sync-agent-chats.local.env"

if [[ -f "$LOCAL_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$LOCAL_ENV"
  set +a
fi

SOURCE="${CURSOR_AGENT_TRANSCRIPTS_DIR:-}"
RESOLVER="${REPO_ROOT}/scripts/resolve-cursor-transcripts-dir.mjs"
if [[ (-z "$SOURCE" || ! -d "$SOURCE") ]] && command -v node >/dev/null 2>&1 && [[ -f "$RESOLVER" ]]; then
  AUTO="$(node "$RESOLVER" "$REPO_ROOT" 2>/dev/null | tr -d '\r' || true)"
  if [[ -n "$AUTO" && -d "$AUTO" ]]; then
    SOURCE="$AUTO"
  fi
fi

if [[ -z "$SOURCE" || ! -d "$SOURCE" ]]; then
  echo "sync-agent-chats: no Cursor transcript dir (set CURSOR_AGENT_TRANSCRIPTS_DIR, scripts/sync-agent-chats.local.env, or open this repo in Cursor for auto-discovery). Skipping."
  exit 0
fi

mkdir -p "$DEST"
n=0
while IFS= read -r -d '' f; do
  cp -f "$f" "${DEST}/$(basename "$f")"
  n=$((n + 1))
done < <(find "$SOURCE" -type f -name '*.jsonl' -print0 2>/dev/null || true)

if [[ "$n" -eq 0 ]]; then
  echo "sync-agent-chats: no .jsonl files under $SOURCE"
  exit 0
fi

echo "sync-agent-chats: copied $n file(s) from $SOURCE to docs/agent-chats"
