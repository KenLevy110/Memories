---
name: developer-frontend-ui
description: >-
  Builds and reviews browser UI for this repo: TypeScript, React, Vite, React Router or TanStack Router, Radix UI and/or React Aria, Zod-driven form UX (Unicode limits, inline errors, remaining counts), Sonner or Radix Toast, Vitest + Testing Library, and Playwright for accessibility and flows. Enforces dialog focus/Escape, T3 outside-click semantics, toast visibility cap, and deep-link routes. Use when implementing layouts, components, routing, modals, forms, toasts, styling, or UI-focused tests—not for TanStack Query cache/SSE wiring (see developer-frontend-data-sync).
instructions: Interactively work with the user to determine the design wireframe. Ask questions and provide feedback if needed.
---

# Frontend UI developer

## When to apply

Use for **presentation, routing, accessibility, forms, and UI tests**. Stack authority: [docs/tech-stack.md](../../../docs/tech-stack.md). For **server state, caching, mutations, and SSE**, use the sibling skill [developer-frontend-data-sync](../developer-frontend-data-sync/SKILL.md).

## Stack (this skill)

| Area | Choice |
| --- | --- |
| Language | TypeScript |
| UI | React |
| Build | Vite (SPA for MVP) |
| Routing | React Router **or** TanStack Router |
| A11y primitives | Radix UI **and/or** React Aria |
| Form validation UX | Zod (consume schemas; mirror API rules in UI) |
| Toasts | Sonner **or** Radix UI Toast |
| Unit / component tests | Vitest + Testing Library |
| E2E | Playwright (flows, keyboard, toast UI) |

## Implementation rules

1. **Radix / React Aria**
   - Use for modals and focus-heavy UI (**T1–T4**, **M2**, **FR-L09**): **focus trap**, **Escape** per wireframe *Accessibility*.
   - **T3** is a **distinct variant**: outside click = **pending**, not declined—do not reuse a dismiss pattern that treats outside click as cancel/decline.

2. **Zod + forms (UI layer)**
   - Align field rules with API **Unicode code-point** limits (same max as backend); prefer **shared** schemas from the data/sync layer when they exist.
   - Show **remaining character count** near list-name and item fields when approaching limits (e.g. near **50** code points where the product spec applies).
   - Surface validation errors **next to fields**.

3. **Toasts**
   - Single app-wide provider; **at most 4 visible** with a **queue** for overflow (see [design-wireframe-v1.md](../../../docs/design-wireframe-v1.md) — toast stack / design risks).
   - No duplicate providers per route.

4. **Routing**
   - Register routes for deep links: **T4**, **N1**, magic-link **A3** callback, notification deep links (**TBD** in TDD).

## Testing expectations

- **Vitest + Testing Library**: components and hooks that do not require a live API; prefer **accessible** queries (role, name).
- **Playwright**: keyboard paths **L1**, **T3**, **T4** (**NFR-04**); **S0 → T4** with zero lists; smoke **toast stack cap (4)**. Align with TDD §11 where applicable.

### Quick references

- Deep-link route refs: **T4** (invite/share), **N1** (notifications), **A3** (magic-link callback), plus TDD-defined notification entity links.
- Toast provider pattern: one provider at app root, max **4** visible, queue overflow, avoid per-route providers.
- Unicode reminder: validate code points (not only `string.length`) when API does, and pair mutation failures with inline field errors.

## Before shipping UI changes

- [ ] Dialogs/drawers: focus trap, Escape, and **T3** outside-click semantics.
- [ ] Forms: Zod rules match API; remaining-count hints where required.
- [ ] Toasts: one provider; max 4 visible + queue.
- [ ] Routes registered for **T4**, **N1**, **A3** (and TDD notification links when defined).
- [ ] RTL and/or Playwright updated for behavior you changed.
