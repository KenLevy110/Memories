---
name: technical-designer
description: >-
  Produces technical design documents (TDDs) from approved or draft PRDs: architecture, data model, APIs, integrations, security, performance, observability, rollout, and traceability to requirement IDs (FR/NFR). Reads reference.md for a paste-ready markdown template. Use when the user wants a technical design, architecture spec, eng design doc, API design, system design, or implementation plan tied to product requirements.
instructions: Interactively work with the user to determine the technical design.
---

# Technical design (from product requirements)

## When to apply

Use when the user is defining *how* to build something: components, contracts, storage, APIs, and operational characteristics. Default to a **TDD** that **maps to** the PRD’s functional and non-functional requirement IDs.

If there is no PRD yet, either (a) draft a minimal **problem/solution/scope** section in the TDD and list assumptions, or (b) suggest running the product-manager skill first for stable FR/NFR IDs.

## Relationship to the PRD

| PRD (what / why) | TDD (how) |
|------------------|-----------|
| FR / NFR IDs, acceptance criteria | Each major design element cites affected IDs |
| User-visible behavior | Internal behavior, interfaces, failure modes |
| Scope and phasing | Concrete components, migrations, flags |

Do not restate the full PRD. **Link** to it and use a **traceability** subsection or table.

## Principles & quality bar

1. **Decisions with alternatives** — For each significant choice, note one rejected option and why (short ADR-style or bullet).
2. **Interfaces are contracts** — APIs, events, and schemas are specified enough for parallel implementation and review.
3. **Explicit non-goals** — What this design intentionally does not solve (avoids scope creep).
4. **Operational reality** — Deployment, rollback, monitoring, and data migration are first-class, not an afterthought.
5. **Security and privacy by design** — Threats, trust boundaries, authn/z, PII handling, aligned to NFRs.
6. **Testability** — How the design supports unit, integration, and E2E checks implied by acceptance criteria.

## Workflow

1. **Ingest** — Read or summarize linked PRD: scope, FR/NFR IDs, NFRs (latency, availability, compliance).
2. **Context diagram** — System boundary, actors, external dependencies.
3. **Core design** — Components, data flow, storage, APIs/events; keep diagrams concise (mermaid OK).
4. **Cross-cutting** — Security, performance, observability, idempotency, consistency.
5. **Rollout** — Phasing, feature flags, migrations, backward compatibility.
6. **Risks & open questions** — Technical unknowns and who decides.
7. **Traceability** — Table or list: FR/NFR → design section / component / test notes.

Mark **TBD** where data is missing; call out **assumptions** explicitly.

## Full template

For the complete markdown skeleton, read [reference.md](reference.md) when producing or restructuring a TDD.

## Collaboration

- Prefer **one doc per major feature or bounded context**; split if the design exceeds what a team can review in one session.
- If the user merges PRD + TDD in one file, preserve clear headings so requirements and design remain distinguishable for QA and compliance.

## Keeping copies in sync

If this skill exists under both `~/.cursor/skills/technical-designer/` and the repo’s `.cursor/skills/technical-designer/`, update **SKILL.md** and **reference.md** in both places when you change the skill.
