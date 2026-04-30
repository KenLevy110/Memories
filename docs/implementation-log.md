# Memories Implementation Log

## Document control

| Field | Value |
| --- | --- |
| **Owner** | Engineering |
| **Status** | Active |
| **Last updated** | 2026-04-30 |
| **Template used** | Repository convention (implementation activity log) |
| **Related docs** | [product-requirements-v1.md](product-requirements-v1.md); [technical-design-v1.md](technical-design-v1.md); [development-plan-v1.md](development-plan-v1.md); [development-plan.md](development-plan.md) (pointer); [adr/README.md](adr/README.md) |

---

## Purpose

Track meaningful implementation work over time with enough context to support maintenance, onboarding, and incident response.

Use this log for code-level changes (features, fixes, refactors, infra changes) and link to ADRs when a change includes an architectural decision.

---

## Entry format

Each entry should include:

- Date
- Area (API, Web, Shared, Docs, Infra)
- Change summary (what shipped and why)
- Files and systems touched
- Validation performed (tests, lint, typecheck, manual checks)
- Follow-ups / risks
- Links (PR, issue, ADR, runbook)

---

## Entries

### 2026-04-30 - Remove `docs/examples` (foreign multi-list samples)

- **Area:** Docs
- **Summary:** Deleted **`docs/examples/multi-list/`** sample PRD/TDD/wireframes (different product, outdated plan links). **`AGENTS.md`** now points structure reference to editioned **`docs/*-v1.md`** plus **`docs/templates/`**.
- **Touched:** `docs/examples/` (removed), `AGENTS.md`, `docs/implementation-log.md`
- **Validation:** Grep for broken `docs/examples` references (none required outside removed files).

### 2026-04-30 - Development plan versioning (governance)

- **Area:** Docs / Governance
- **Summary:** Aligned **AGENTS.md**, **docs-governance**, PRD/TDD/tech-stack links, and **`developer-manager`** skill with **editioned** `docs/development-plan-v1.md` plus optional **`docs/development-plan.md`** pointer. **development-planner** skill already prefers `development-plan-v{N}.md`; **cursor-template** mirrors template + governance wording.
- **Touched:** `AGENTS.md`, `.cursor/rules/docs-governance.mdc`, `.cursor/skills/developer-manager/SKILL.md`, `docs/development-plan.md`, `docs/templates/development-plan-template.md`, `docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, `docs/tech-stack.md`, `docs/implementation-log.md`
- **Validation:** Cross-link pass; pointer resolves to `development-plan-v1.md`.
- **Links:** [development-plan-v1.md](development-plan-v1.md)

### 2026-04-30 - Technical decisions documented (SoR, auth, routing)

- **Area:** Docs / Architecture
- **Summary:** Accepted **ADR-20260430** (platform vs Memories system-of-record split, JWT verification, TanStack Router + `?step=`, client-side drafts, Postgres job queue + poll for transcripts, Drizzle, S3 key layout, pilot policies). Updated **technical-design-v1.md** to v1.1 Approved, **tech-stack.md** to Approved, **product-requirements-v1.md** open questions resolved and FR-007 clarified. Ken Levy recorded as engineering owner and sign-off.
- **Touched:** `docs/adr/ADR-20260430-memories-platform-boundary-auth-routing.md`, `docs/adr/README.md`, `docs/adr/ADR-20260423-postgres-system-of-record.md`, `docs/technical-design-v1.md`, `docs/tech-stack.md`, `docs/product-requirements-v1.md`, `docs/memories-user-workflow-v1.md`, `docs/implementation-log.md`
- **Validation:** Doc consistency pass; cross-links between PRD, TDD, tech-stack, ADR index.
- **Follow-ups:** Coordinate JWT claim names with Dashboard; lock STT/LLM vendor instances after BAAs; keep [development-plan-v1.md](development-plan-v1.md) thresholds and owners updated as alerting lands.
- **Links:** [ADR-20260430](adr/ADR-20260430-memories-platform-boundary-auth-routing.md)

### 2026-04-23 - Documentation governance baseline

- **Area:** Docs / Project governance
- **Summary:** Synced updated documentation templates from `cursor-template` and introduced implementation + ADR tracking structure in this repository.
- **Touched:** `docs/templates/product-requirements-template.md`, `docs/templates/technical-design-template.md`, `docs/templates/development-plan-template.md`, `docs/templates/design-wireframe-template.md`, `docs/implementation-log.md`, `docs/adr/README.md`, ADR starter files.
- **Validation:** File sync and repository structure checks.
- **Follow-ups:** Add implementation entries for all future non-trivial feature/fix work. Keep ADR statuses current when decisions are accepted or superseded.
- **Links:** [ADR index](adr/README.md)
