---
name: development-planner
description: >-
  Turns product requirements (PRD), wireframes, and technical design into an actionable software development plan: work breakdown, sequencing, dependencies, milestones, testing and rollout alignment, risks, and traceability to FR/NFR and design sections. Use when the user wants a dev plan, implementation plan, eng roadmap, sprint breakdown, work breakdown structure (WBS), delivery plan, or execution plan after requirements and design exist.
instructions: >-
  Interactively confirm timeline constraints, team shape, and priority when the user has not stated them; otherwise produce the plan from provided inputs.
  Default to **versioned** plan filenames paired with PRD/TDD editions (see Output shape).
---

# Software development plan (from PRD, wireframes, and technical design)

## When to apply

Use when **what** (PRD), **UI structure and flow** (wireframes), and **how** (technical design / TDD) exist — or the user wants a plan from **partial** inputs with explicit gaps. Produces an **execution-oriented plan**; it does not replace the PRD / wireframes / TDD, it synthesizes them. Out of scope: org-level coordination and status/risk rituals (use `developer-manager`).

Generated plans MUST follow **`docs/templates/development-plan-template.md`** (Sections **1–13**, tables, headings, and wording conventions). Templates may mark Section 12 as optional — this skill **requires** Section **12 for agent-assisted execution**.

Every agent-executable plan must include, no exceptions:

1. Sequenced ticket-like implementation prompts, each ending with a **Skills to read first** line and a **Verify** line.
2. **Epic review and acceptance matrix** (development-plan §**12.4**).
3. **Manual test execution matrix** (development-plan §**12.5**).
4. **Mobile automation standard** for web UI work (development-plan §**12.6** — see below).

## Sibling skills (repo)

| Input lane | Skill folder |
| --- | --- |
| PRD, FR/NFR, stories | `.cursor/skills/product-manager/` |
| Screens, flows, states | `.cursor/skills/designer-wireframe/` |
| Architecture, APIs, rollout | `.cursor/skills/technical-designer/` |

Skills named in-plan should exist under `.cursor/skills/<name>/SKILL.md` in the **target repo** (drop names that repo does not ship).

Typical citation set (mirror development-plan §**12.1** + session defaults):

- Lane: `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-backend`, `developer-database`.
- Conditional: `developer-security`, `developer-unit-testing`, `developer-quality-assurance`, `developer-manager`, `developer-senior` — when scope matches development-plan §**12.1** table.
- Session defaults (often omitted from each prompt body): **`developer-testing`**, **`developer-code-quality`** per development-plan §**12** “Session defaults”.

## Output shape (versioned)

**Primary artifact — versioned:**

- Prefer **`docs/development-plan-v{edition}.md`** keyed to the same **edition** as paired specs, for example PRD **`product-requirements-v1.md`** plus TDD **`technical-design-v1.md`** ⇒ plan **`development-plan-v1.md`**.
- Breaking / major initiative replans: **new file** (`development-plan-v2.md`, …) per repository doc-edition norms; link the prior edition in **§2 Linked inputs → Baseline / superseded plans**.

**Optional compat pointer (repository choice):**

- A short **`docs/development-plan.md`** may point humans to the current edition (“see `development-plan-v1.md`”). Do **not** replace the editioned file with unrelated content unless governance requires a single canonical name.

**Authority and metadata:**

1. Duplicate the **`docs/templates/development-plan-template.md`** section structure (**§1 Document control … §13 Revision history**). Paths in generated output assume the repo’s `docs/` layout (read that template from the repo you are planning for).
2. In **§1 Document control**, set **Template used** to **`docs/templates/development-plan-template.md`** (or the repo-relative path templates use).
3. **§2 Linked inputs** MUST include PRD, TDD, wireframes/when applicable, tech stack — and **`Baseline / superseded plans`** when replacing an older `development-plan-v*.md`.

Development-plan Sections **5–13** shorthand (aligned to template numbering):

| Section | Content |
| --- | --- |
| **§5** | Assumptions and constraints; repos may append **§5.1**, **§5.2**, … (e.g. operational alerting starters) **without** renumbering **§6–§13**. |
| **§6** | Work breakdown (**6.1** epics, **6.2** ticket map including dependencies). |
| **§7** | Sequencing and milestones. |
| **§8** | Testing and quality plan; **Quality gates MUST reference** manual §**12.5** and §**12.6** where web/mobile applies. |
| **§11** | Traceability summary. |
| **§12** | Session defaults → **§12.1–12.5** exactly as **`docs/templates/development-plan-template.md`** headings; append **§12.6 Mobile automation standard** after **12.5** when **`apps/web`** exists (skill extension below). §**12.3** is **always** “Standard test commands” per template—manual matrix closes **§12.5**. |

## Section 12 — template conformance + planner extension

**12–12.5:** Copy headings and norms from **`docs/templates/development-plan-template.md`** (Session defaults **12**, Skill-reading convention **12.1**, per-ticket prompts **12.2**, standard test commands **12.3**, epic matrix **12.4**, manual matrix **12.5**). Do **not** invent conflicting subsection numbers.

Per-prompt **`Skills to read first`** lines MUST obey development-plan §**12.1**:

- Prefer **lean** prompts: **2–3 lane skills** mapped from §**6.2** owner lane, plus **`developer-security`** when trust boundaries shift, plus **`developer-unit-testing`** only when prompts reshape tests, **`developer-manager`** rollouts/flags/checklists, **`developer-quality-assurance`** only for QA/regression expansion, **`developer-senior`** only for high‑risk ticket rows or checklist items in §**12.1**.
- Assume **§12 Session defaults** (`developer-testing`, `developer-code-quality`) apply to every execution without repeating unless the repo’s development-plan deliberately opts out.

Every **Prompt T#** block: Implementation body, **`Skills to read first`**, **`Verify`** — matching template §**12.2** four-part shape.

### 12.6 Mobile automation standard (required for web UI; add after template §12.5)

Repos may not yet have Playwright project names finalized — substitute the repo’s **CI equivalents** while keeping semantics.

Development plans that include **`apps/web`** (or comparable) MUST append **`### 12.6 Mobile automation standard`** covering at least:

| Requirement | Detail |
| --- | --- |
| **Smoke flows** | List **Android** + **iPhone** (or WebKit/mobile Safari) emulation smoke paths that mirror **hands-on regression** priorities (capture, list, detail, rollout flags if any). Tie paths to §**12.5** scenarios where sensible. |
| **PR gates** | **CI must run mobile smoke using both**: `mobile-chrome` (or Chromium device emulation/project) **and** `mobile-safari` (Playwright **`webkit`** or Safari device project)—or the repo-naming equivalent surfaced in **`package.json` / workflows**. |
| **Artifacts** | On failure: attach trace / screenshot / HTML report paths to CI or PR notes per **`developer-testing`**. |
| **Full regression cadence** | State **when** exhaustive mobile regressions happen (**nightly** vs **pre-release**), separate from slim PR smoke. |

If the repo truly has **no browser UI**, omit §**12.6** explicitly with one line rationale in §**8**.

### Completeness check (before finalizing)

- Ticket map §**6.2**: every ticket has one §**12.2** prompt (IDs align).
- Every §**12.2** prompt has **Skills to read first** + **Verify**; skills match §**12.1** lean rules plus session defaults awareness.
- Every epic from §**6.1** appears in §**12.4** epic review matrix rows.
- §**12.5** manual matrix covers **auth/session isolation**, **storage / quota-ish failure modes**, **reconnect retry / idempotency** where FRs require resilience, plus **release/rollout** checks when flags ship.
- §**12.6** present when **`apps/web`** (or declarative omission with rationale).
- §**13** revision history includes **1.0** (or increments) reflecting edition birth or material edits.

## Collaboration

If only two of three inputs (PRD, wireframes, TDD) exist, produce the plan and label assumptions **`wireframe-derived`** or **`TDD-derived`** explicitly.
