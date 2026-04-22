---
name: development-planner
description: >-
  Turns product requirements (PRD), wireframes, and technical design into an actionable software development plan: work breakdown, sequencing, dependencies, milestones, testing and rollout alignment, risks, and traceability to FR/NFR and design sections. Use when the user wants a dev plan, implementation plan, eng roadmap, sprint breakdown, work breakdown structure (WBS), delivery plan, or execution plan after requirements and design exist.
instructions: Interactively confirm timeline constraints, team shape, and priority when the user has not stated them; otherwise produce the plan from provided inputs.
---

# Software development plan (from PRD, wireframes, and technical design)

## When to apply

Use when **what** (PRD), **UI structure and flow** (wireframes), and **how** (technical design / TDD) exist — or the user wants a plan from **partial** inputs with explicit gaps. Produces an **execution-oriented plan**; does not replace the PRD / wireframes / TDD, it synthesizes them. Out of scope: org-level coordination and status/risk rituals (use `developer-manager`).

Every generated plan must include, no exceptions:

1. Sequenced ticket-like implementation prompts, each ending with a **Skills to read first** line and a **Verify** line.
2. Epic review and acceptance matrix.
3. Manual test execution matrix.
4. A mobile automation standard for web UI work: PR gate mobile smoke on Android + iPhone emulation, with broader mobile regression cadence documented (nightly or pre-release).

## Sibling skills (repo)

| Input lane | Skill folder |
|---|---|
| PRD, FR/NFR, stories | `.cursor/skills/product-manager/` |
| Screens, flows, states | `.cursor/skills/designer-wireframe/` |
| Architecture, APIs, rollout | `.cursor/skills/technical-designer/` |

**Developer-role skills** the planner may cite in per-prompt `Skills to read first` lines (only include skills that actually exist in the target repo under `.cursor/skills/`):

- Lane-specific: `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-backend`, `developer-database`, `developer-security`.
- Baseline (always include): `developer-senior`, `developer-unit-testing`, `developer-testing`.
- Conditional: `developer-quality-assurance` (QA/regression prompts), `developer-manager` (rollout/release prompts).

## Output shape

Default to structured markdown in `docs/development-plan.md` (or the team's `docs/` path) so links from wireframes and the stack stay stable.

Required section pattern:

- **§6** Work breakdown (epics and tickets).
- **§7** Sequencing and milestones.
- **§8** Testing and quality plan.
- **§12** Sequenced ticket-like prompts (run one at a time).
- **§12.0** Skill-reading convention (required per prompt).
- **§12.1** Epic review and acceptance matrix.
- **§12.2** Manual test execution matrix.
- **§12.3** Mobile automation standard (Android + iPhone).

Section/table requirements:

- **§12 prompts**: one prompt per ticket, standalone/copy-paste, ends with a **Skills to read first** line AND a **Verify** line.
- **§12.0**: short paragraph only — state that each prompt ends with a `Skills to read first` line, that the agent MUST read each named `.cursor/skills/<name>/SKILL.md` before writing code, and that skills read are recorded in the PR/commit. **Do not** produce a central owner-lane → skills lookup table; keep the list inline per prompt so an agent invoked with "implement Prompt T#" sees them without reading the whole section.
- **§12.1** columns ≥ `Epic`, `Includes tickets`, `Primary reviewers`, `Epic done gate`.
- **§12.2** organized by epic; columns ≥ `Epic`, `Manual test scenario`, `Related tickets`, `Steps to execute`, `Expected result` (optional `Sign-off`).
- **§12.3** includes at least: mobile smoke flow list, CI execution requirement for both `mobile-chrome` and `mobile-safari`, artifact capture requirement, and where full mobile regression runs (nightly/pre-release).

### Per-prompt `Skills to read first` — how to compose

For each `§12` prompt, list in this order, comma-separated, one line:

1. **Lane-specific** from the ticket's `Owner lane` in `§6.2` (e.g. backend+database, frontend-data-sync, frontend-ui).
2. **Baselines** — `developer-senior`, `developer-unit-testing`, `developer-testing`.
3. **Conditional** — add `developer-security` when the prompt touches auth/sessions/authorization/data isolation; `developer-quality-assurance` for QA/regression prompts; `developer-manager` for rollout/release prompts.
4. Drop any skill that does not exist in the target repo.

Format:

```
**Skills to read first:** `developer-<lane>`, `developer-senior`, `developer-unit-testing`, `developer-testing`.
```

### Completeness check (before finalizing)

- Every ticket in the ticket map has a matching `§12` prompt.
- Every `§12` prompt has a `Skills to read first` line with ≥1 lane-specific skill + the three baselines; conditionals are present where the prompt scope requires them.
- Every referenced skill exists under `.cursor/skills/<name>/SKILL.md` in the target repo.
- Every epic appears in `§12.1`.
- `§12.2` covers high-risk scenarios mapped to epics/tickets (conflicts, auth/session, storage/quota, reconnect/replay, rollout).
- "Quality gates" references manual validation and points to `§12.2`.
- If the plan includes web UI, quality gates include mobile smoke automation requirements and point to `§12.3`.

## Collaboration

If only two of three inputs exist, produce the plan and label assumptions **wireframe-derived** or **TDD-derived** explicitly.
