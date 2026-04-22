# Frontend data & sync developer — reference

Use with [SKILL.md](SKILL.md). Full stack: [docs/tech-stack.md](../../../docs/tech-stack.md). UI, routing, dialogs: [developer-frontend-ui](../developer-frontend-ui/SKILL.md).

## TanStack Query — suggested query keys

Keep keys **stable** and **hierarchical**:

| Key shape | Typical use |
| --- | --- |
| `['lists']` | All lists / list index |
| `['list', listId]` | Single list detail |
| `['invites', 'pending']` | Pending invites |

**After mutations**, invalidate the smallest consistent set:

- List index / membership / create-rename-delete -> `['lists']` and affected `['list', id]`.
- Item CRUD, toggle done, sync-visible fields -> `['list', listId]`.
- Invites -> `['invites','pending']` plus any `['list', id]` or `['lists']` per API response.

**Refetch tuning**

- `refetchOnWindowFocus: true` (global or per-query).
- On **L1** mounted: optional short `refetchInterval` (tune per TDD/ops).

## SSE — `EventSource` lifecycle

1. **Open** when entering a **live sync list** view with valid session/list scope.
2. **URL** from TDD (same origin or CORS as configured).
3. **On message**: parse payload; `queryClient.setQueryData(['list', id], updater)` or `invalidateQueries({ queryKey: ['list', id] })` — prefer patch for deltas when types allow.
4. **On error**: rely on Query refetch/focus/interval; avoid tight reconnect loops without backoff unless TDD specifies.
5. **Close** in `useEffect` cleanup; call `.close()` when `listId` changes.

## Zod — alignment with API

- Same max lengths and enums as server validation.
- Use **Unicode code-point** length when the API specifies it, not only JavaScript string length.

## Out of scope (MVP stack)

- Default realtime is **not** WebSocket.
- **not** GraphQL for MVP.
