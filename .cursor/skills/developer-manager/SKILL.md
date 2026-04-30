---
name: developer-manager
description: Aligns technical design and stack with product requirements and design, and coordinates engineering work across people, sequencing, and delivery.
instructions: Optimize for traceability from requirements to implementation, clear ownership, dependency-aware sequencing, and predictable delivery.
---

# Developer Manager

## Scope

Use when validating that the technical approach fits the product, when planning or adjusting how engineering work is sequenced and staffed, or when coordinating across roles (product, design, backend, frontend, QA). Not a substitute for hands-on code review or implementation detail—that belongs with developer-senior and domain skills (backend, frontend, database, etc.).
Out of scope: authoring a full execution-plan document from PRD/wireframes/TDD inputs (use `development-planner`).

## Technical alignment (spec and stack)

- Trace **requirements and design** to **technical design** and **stack choices**: every major requirement or user-facing behavior should map to an explicit design decision, API or data shape, and justified technology (see `docs/product-requirements-v1.md`, wireframes or design references, `docs/technical-design-v1.md`, `docs/tech-stack.md`).
- Call out **gaps and mismatches** early: missing NFRs in the spec, stack limitations, unknown integration constraints, or design that is ambiguous for implementation.
- Ensure **scope and phasing** in the technical plan match product priorities (MVP vs later), and that rollbacks, migrations, and feature flags are considered when the spec implies risk or partial rollout.
- When architecture, testing policy, or release gates change, remind to keep **docs** in sync per repo guidance (`docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, `docs/development-plan-v1.md`, optional `docs/development-plan.md` pointer, `docs/tech-stack.md`).

## Engineering coordination

- Make **ownership and sequencing** explicit: who builds what, what blocks what, and which decisions are still open before coding should proceed.
- Align **milestones and definitions of done** with tests, observability, and security expectations from `AGENTS.md` and project rules—without bypassing coverage or quality gates.
- Surface **risks, assumptions, and dependencies** (external teams, envs, data, approvals) in a concise form suitable for stakeholders and standups.
- Reduce thrash: prefer **single sources of truth** for scope (PRD, TDD, tickets) and flag when parallel tracks are diverging.
- When sequencing work against **`docs/development-plan-v1.md` Section 12**, validation works like this:
  - **Session defaults:** Every implementation prompt implicitly requires **`developer-testing`** and **`developer-code-quality`** (Section 12 intro + **§12.1**)—do not insist those names appear on each **Skills to read first** line.
  - **Lean per-prompt lists:** **`Skills to read first`** names **lane** skills plus **conditional** extras per plan **§12.1** (security, senior on high‑risk merges, QA/manager where the ticket warrants). Flag omissions only when §6.2 **Owner lane** or trust boundaries imply a skill §12.1 would add (e.g. authz ticket missing **`developer-security`**).
  - Optionally add **`developer-senior`**, **`developer-unit-testing`**, or **`developer-testing`** on the prompt when the ticket reshapes risky contracts or harnesses—even if §12.1 could have been silent.

## Delivery checklist

- Requirements and design are reflected in (or explicitly deferred from) the technical design and stack narrative.
- Work is broken into **coherent increments** with clear interfaces between contributors.
- Test, observability, and security work are **planned in the same slices** as features, not left as a final pass.
- A short **status and risk log** is maintained for stakeholder updates.
- Every **Section 12** implementation prompt in the active editioned plan (e.g. `docs/development-plan-v1.md`) has a **`Skills to read first`** line, and PRs record which skills were read before coding began.
