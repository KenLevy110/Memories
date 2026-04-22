---
name: designer-wireframe
description: >-
  Produces low- to mid-fidelity UI wireframes and screen flows: screen inventory, layout zones, navigation, states (empty/loading/error), and annotations. Outputs ASCII box layouts, mermaid diagrams, and structured markdown. Use when the user asks for wireframes, screen mockups (low-fi), UI layout sketches, page structure, app flow diagrams, or visual IA before high-fidelity design or build.
instructions: Interactively work with the user to determine the design wireframe. Ask questions and provide feedback if needed.
---

# Design wireframes

## When to apply

Use when the user wants **structure and flow** without visual branding: what appears on each screen, how users move between screens, and where primary actions live. **Do not** substitute for a PRD or TDD—wireframes illustrate **layout and interaction**; requirements and engineering specs stay in those documents.

**Pairing:** If a PRD or user stories exist (e.g. product-manager skill), **map screens and states** to FR IDs or story IDs. When wireframes drive implementation, point to the technical-design skill for APIs and data.

## Fidelity

| Level | Use when | Output |
|-------|----------|--------|
| **Conceptual** | Exploring IA and flow | Screen list, mermaid flow, rough zones |
| **Low-fi wireframe** | Aligning on layout before UI design | ASCII boxes, labeled regions, primary CTAs |
| **Annotated** | Handoff to design or eng | Notes on behavior, validation, empty states, links to FR/NFR |

Default to **low-fi** unless the user asks for faster exploration (conceptual) or more detail (annotated).

## Principles

1. **Content and tasks first** — Every screen answers: who, primary task, success outcome.
2. **States are not optional** — At least note default, empty, loading, and error where they matter.
3. **Consistent chrome** — Reuse the same top/nav pattern across screens unless the user specifies otherwise.
4. **No fake precision** — Avoid pixel values, real copy, or brand colors unless provided.
5. **Traceability** — When requirements exist, tag sections with `[FR-…]` or story IDs in annotations.

## Workflow

1. **Clarify** — Platform (web/mobile/desktop), primary user flows, and must-have screens.
2. **Inventory** — Table of screens with one-line purpose; optional mermaid for navigation/flow.
3. **Wireframe** — One ASCII (or described block) layout per screen; repeat patterns for variants only when they differ.
4. **Annotations** — Behaviors, validations, and edge cases in bullets under each screen or in a shared “Global patterns” section.
5. **Open questions** — List ambiguities for product or design to resolve.

## ASCII layout conventions

- Use `+`, `-`, `|` for boxes; keep width ≤ ~72 characters when possible.
- Label regions: `[Header]`, `[Nav]`, `[Main]`, `[Primary action]`, `[List]`, `[Footer]`.
- Use `...` for scrollable or repeated content.

## Output skeleton

When producing a full wireframe doc, include:
- Document control (title, version, date, author, status)
- Screen inventory (screen, purpose, primary actor, entry points)
- Navigation and flow (mermaid or equivalent)
- One low-fi layout per screen (ASCII regions + primary actions)
- Screen states (default, empty, loading, error)
- Interaction and validation annotations
- Open questions and assumptions