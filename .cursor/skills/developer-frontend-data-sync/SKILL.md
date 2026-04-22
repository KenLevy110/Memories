---
name: developer-frontend-data-sync
description: >-
  Implements and reviews client server state and realtime sync for this repo: TanStack Query (caching, invalidation, refetch-on-focus, optional refetch interval on L1), native EventSource (SSE) per sync list with safe lifecycle, mutation strategies (optimistic toggle/add vs pessimistic deletes), and Zod schemas aligned with the API for request/response validation. Use when adding or changing queries, mutations, hooks, SSE consumers, cache updates, or data consistency after API changes—not for Radix/dialog/toast layout (see developer-frontend-ui).
instructions: Interactively work with the user to determine the design wireframe. Ask questions and provide feedback if needed.
---

# Frontend data & sync developer

## When to apply

Use for **TanStack Query**, **`EventSource` (SSE)**, **cache invalidation**, **mutation behavior**, and **Zod schemas** shared with API rules. Stack authority: [docs/tech-stack.md](../../../docs/tech-stack.md). For **modals, a11y, toasts, routes, and visual forms**, use [developer-frontend-ui](../developer-frontend-ui/SKILL.md).

## Stack (this skill)

| Area | Choice |
| --- | --- |
| Server state | TanStack Query |
| Realtime | Native `EventSource` (SSE); no WebSocket for MVP default |
| Validation (shared) | Zod — mirror API (lengths, enums, Unicode code points) |

## Implementation rules

1. **TanStack Query**
   - **`refetchOnWindowFocus`**: enable for sync freshness when SSE is flaky.
   - Optional **short `refetchInterval`** while **L1** sync list view is mounted.
   - After successful mutations, **invalidate** at least: `['lists']`, `['list', id]`, `['invites','pending']` for **M1** / **T4** / **FR-S16** consistency.

2. **SSE**
   - One **`EventSource`** per **open sync list**; **close** on navigate away / unmount to avoid leaks.
   - On message: **patch** query data or **invalidate** `['list', id]` so **FR-S15** (title/items) updates without full reload.

3. **Zod (data contract)**
   - Prefer **shared** or **mirrored** modules with the API for max lengths, enums, and **Unicode code-point** rules.
   - UI layers consume the same schemas for parsing and errors (see UI skill for display hints).

4. **Optimistic updates (optional, MVP+)**
   - **`useMutation` `onMutate`** acceptable for **toggle done** and **add item** with correct rollback on error.
   - **Delete item** and **delete list**: **pessimistic** or **confirm-first** (no item undo).

## Before shipping data/sync changes

- [ ] Invalidation keys updated after mutations touching lists, a list, or pending invites.
- [ ] `EventSource` closed in effect cleanup and when `listId` changes.
- [ ] Zod rules match API; types/schemas updated if contract changed.
- [ ] Tests: RTL for hooks that mock Query client where useful; E2E may assert UI reflects updates after SSE (coordinate with UI skill for Playwright structure).

## Additional detail

See [reference.md](reference.md) for query keys, invalidation matrix, SSE lifecycle, and MVP out-of-scope transport.
