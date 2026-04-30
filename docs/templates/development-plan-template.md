# [Product or initiative name] — development plan

## 0. How to use this template

**Purpose:** Turn PRD, technical design, and optional wireframes into a **delivery plan**: linked inputs, scope, work breakdown, sequencing, testing and rollout alignment, risks, traceability, and (optionally) **one prompt per ticket** for AI-assisted execution.

**Prerequisites:** Draft or approved product requirements, technical design, and tech stack summary. Add wireframes and ADRs when they exist.

**How to fill:** Replace every placeholder and table cell. **Remove** linked-input rows (§2) for artifacts this repo does not use. **Do not** paste an entire prior product’s plan; derive tickets from the current PRD/TDD only.

**Section 12:** Optional. Omit it if you track execution only in an issue tracker. If you include it, add **one** subsection per ticket in §6.2 using the pattern in §12.4.

---

## 1. Document control


| Field       | Value                                      |
| ----------- | ------------------------------------------ |
| **Title**   | [Short title — include release label if applicable] |
| **Version** | [0.1]                                      |
| **Author**  | [Name]                                     |
| **Date**    | [YYYY-MM-DD]                               |
| **Status**  | Draft \| In review \| Approved             |
| **Release** | [Optional: e.g. v1.2, MVP milestone name]  |
| **Template used** | `docs/templates/development-plan-template.md` |


Per [documentation governance](../../.cursor/rules/docs-governance.mdc), derived documents should record **Template used** (included above).


## 2. Linked inputs

Delete rows you do not maintain in this repository.


| Artifact                         | Location                                                  |
| -------------------------------- | --------------------------------------------------------- |
| **PRD**                          | [product-requirements.md](product-requirements.md) [v…]   |
| **Technical design**             | [technical-design.md](technical-design.md) [v…]           |
| **Wireframes** (if applicable)   | [design-wireframe.md](design-wireframe.md) [v…]             |
| **Tech stack**                   | [tech-stack.md](tech-stack.md)                            |
| **Implementation log**         | [implementation-log.md](implementation-log.md)            |
| **Runbook**                      | [runbook.md](runbook.md)                                  |
| **ADR index**                    | [adr/README.md](adr/README.md)                            |
| **Baseline / superseded plans**| [Link older plans or “—” if none]                         |
| **Execution status** (optional)| [status.md](status.md)                                    |


## 3. Executive summary

- **Delivery goal:** [One paragraph: what ships and how success is measured.]
- **Product locks / decisions:** [Bullets for non-negotiables already decided.]
- **Execution approach:** [Dependency order or phased narrative in plain language.]
- **Quality bar:** Align with **`AGENTS.md`** — typically **≥ 80%** line/statement coverage (and changed-file floor) on automated tests, **security** behavior per PRD/TDD and **`developer-security`**, and **three review layers** before merge on non-trivial work: **`developer-code-quality`** (structural), **`developer-senior`** where §12.1 high-risk list or this plan’s reviewer column applies, and **`developer-quality-assurance`** where **QA** is a primary reviewer or release/regression scope requires it. [Add initiative-specific regression themes or CI script names here.]


### 3.1 AI-first delivery assumptions

- This repository uses an AI-first delivery model: AI agents are expected to design, implement, review, and maintain code by default.
- Difficulty and effort sizing in this plan assume AI-assisted execution by default.
- Mark any task that requires materially higher human-only effort assumptions and explain the reason explicitly in the ticket notes.


## 4. Scope of this plan


| In scope                              | Out of scope                         |
| ------------------------------------- | ------------------------------------ |
| [Capability / theme]                  | [Explicit exclusion]                 |
| […]                                   | […]                                  |


## 5. Assumptions and constraints

- [Technical, product, or operational assumptions — bullets.]
- [Constraints that bound sequencing or implementation choices.]


## 6. Work breakdown (epics and tickets)

### 6.1 Epics


| ID      | Epic           | Goal                              | PRD / design refs   |
| ------- | -------------- | --------------------------------- | ------------------- |
| **E1**  | [Epic name]    | [Outcome in one line]             | [`FR-…`, wire §…]   |
| **E2**  | [Epic name]    | [Outcome in one line]             | […]                 |


### 6.2 Ticket map

Reviewer legend: **Sr** = senior developer, **Sec** = security developer, **QA** = testing developer, **Manual** = hands-on manual verification by product/eng lead. Adjust labels to match your team.


| Ticket | Title                          | Epic | Depends on | Owner lane              | Estimate |
| ------ | ------------------------------ | ---- | ---------- | ----------------------- | -------- |
| **T1** | [Concrete deliverable title]   | E1   | —          | [e.g. Backend + database] | S \| M \| L |
| **T2** | [Concrete deliverable title]   | E1   | T1         | […]                     | […]      |


Add rows until every epic has tickets and dependencies read clearly top-to-bottom.


## 7. Sequencing and milestones

### 7.1 Milestones


| Milestone | Outcome                          | Ticket IDs   |
| --------- | -------------------------------- | ------------ |
| **M1**    | [Demo / merge-ready slice]       | T1, T2       |
| **M2**    | […]                              | […]          |


### 7.2 Parallel track guidance

- **[Track name]:** [Ticket IDs]
- **[Track name]:** [Ticket IDs]

Each track should map to the `.cursor/skills/<name>/SKILL.md` files the implementing agent reads before starting work on a ticket; those paths are spelled out per prompt in Section 12 (see §12.1).


## 8. Testing and quality plan


| Area              | Minimum coverage expectation | Related IDs        |
| ----------------- | ---------------------------- | ------------------ |
| Unit / component  | **Default:** meet **`AGENTS.md`** thresholds (typically **≥ 80%** statements/lines repo-wide and **≥ 80%** lines on changed non-trivial modules); Vitest + Testing Library themes for this release — [customize or list focus areas] | [`FR-…`, `NFR-…`] |
| API integration   | [Themes]                     | […]                |
| Web / component   | [Themes]                     | […]                |
| E2E / smoke       | [Themes; note mobile if UI]  | […]                |


Quality gates:

- Keep repo CI gates from `AGENTS.md` unchanged unless this plan documents an intentional policy change (then update `docs/development-plan.md`, `docs/tech-stack.md`, and related docs per governance).
- Treat **`AGENTS.md` → Engineering quality pillars** as the summary bar: **coverage** (unit/component + gates), **secure software**, and **code-quality + senior + QA** layers per ticket reviewers and risk.
- Add targeted regression tests for: [list themes tied to this release].
- For web UI changes that affect layout, dialogs, or touch flows, include or extend Playwright coverage per repo rules (desktop plus mobile smoke where required).
- Before marking any ticket complete, update `docs/implementation-log.md` with the implementation delta (if this repo maintains that log).
- If the ticket changes operator behavior or incident handling, update `docs/runbook.md` in the same PR (if maintained).
- If a major architecture/security/data-contract decision is introduced, changed, or superseded, add/update an ADR in `docs/adr/` and reflect it in the ADR index.
- **Structural code quality:** before requesting senior or peer review on a non-trivial change, read `.cursor/skills/developer-code-quality/SKILL.md` and pass its checklist. Tie this to the closing note under Section 12.3 when you add a manual matrix.


## 9. Rollout and operations

1. [Ordered rollout steps — feature flags, cohorts, monitoring.]
2. **Health / readiness:** For services behind load balancers or orchestrators, confirm the technical design documents liveness vs readiness (or equivalent) per `docs/templates/technical-design-template.md` §6.1 and that staging or production probe config matches; update `docs/runbook.md` if on-call steps change.

Rollback:

- [How to revert safely without corrupting user data or leaving orphaned state.]


## 10. Risks and mitigations


| Risk          | Impact              | Mitigation                    |
| ------------- | ------------------- | ----------------------------- |
| [Risk]        | [Likelihood / severity summary] | [Mitigation + owner] |


## 11. Traceability summary


| PRD / TDD focus | Tickets |
| --------------- | ------- |
| [`FR-…` theme]  | T1, T2  |
| […]             | […]     |


## 12. Sequenced ticket-like prompts (optional; run one at a time)

Use each prompt in order when executing with an implementation agent. Each prompt is written to be copy-pasted as a standalone task.

### Session defaults (read once per plan / branch execution)

- **`developer-testing`** — Follow `.cursor/skills/developer-testing/SKILL.md` for every test run while executing this plan (temp-file output, polling, hang handling). Do **not** repeat it in each prompt's **Skills to read first** line unless a prompt is unusually test-runner-centric (e.g. stabilizing CI harness only).
- **`developer-code-quality`** — Structural pass before requesting review: see §8 and the closing note under §12.3. Omit from per-prompt lists for the same reason as `developer-testing`.
- **Git / PRs:** Do **not** create branches, pushes, or pull requests on the host unless the human explicitly asks—see **`AGENTS.md` → AI-first delivery model**. Implement on the branch provided; humans open PRs.

### 12.1 Skill-reading convention (required per prompt)

Each prompt ends with a **Skills to read first** line naming skill folders under `.cursor/skills/<name>/` (paths resolve to `.cursor/skills/<name>/SKILL.md`). Keep that line **lean**:

| Include on the prompt | When |
| --- | --- |
| **2–3 lane skills** | Match §6.2 owner lane — e.g. `developer-backend` + `developer-database`, or `developer-frontend-ui` + `developer-frontend-data-sync`. |
| **`developer-security`** | Auth, sessions/cookies, CSRF, admin/support routes, PII-adjacent logs, or materially new trust boundaries. |
| **`developer-unit-testing`** | Only when the ticket **introduces or reshapes** automated tests (new suites, patterns, or coverage expectations worth the conventions in that skill). |
| **`developer-quality-assurance`** | Risk-based test planning, E2E matrices, release smoke expansion — not routine feature prompts. |
| **`developer-manager`** | Rollout sequencing, flags, stakeholder-facing checklists. |
| **`developer-senior`** | **Optional default:** omit from most prompts. Add only for **high‑risk** work (examples: auth/session model, authorization invariants, cross-cutting API contracts, conflict/replay semantics, membership/succession, SSE scope, feature-flag rollout touching prod behavior) **or** when §12.2 marks Sr as a primary reviewer **before** merge for that ticket/epic. |

The implementation agent must:

1. Read `AGENTS.md` and the prompt's row in the §6.2 ticket map (owner lane, dependencies, reviewers).
2. Apply **session defaults** above (`developer-testing`; `developer-code-quality` before review).
3. Read every skill file named in the prompt's **Skills to read first** line.
4. Record in the PR/commit description: (a) prompt-named skills, (b) that session defaults were applied (`developer-testing`, and `developer-code-quality` before review).

Embed the per-prompt skill list on purpose: an agent invoked with “implement Prompt T#” often reads only that section — lane and conditional skills must travel with the prompt text.

Repository skill folders include: `developer-backend`, `developer-database`, `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-security`, `developer-unit-testing`, `developer-testing`, `developer-quality-assurance`, `developer-senior`, `developer-manager`, `developer-code-quality`.

### 12.2 Per-ticket prompt pattern (repeat for T1 … TN)

For **each** ticket ID in §6.2, duplicate the block below. Keep the **Skills to read first** line lean per §12.1.

#### Prompt T1 — [Ticket title from §6.2]

[Implementation instructions: scope, boundaries, links to PRD/TDD sections, acceptance criteria in prose.]

**Skills to read first:** `developer-backend`, `developer-database` *(add `developer-unit-testing` if Verify requires new/changed automated tests; add `developer-security` if sessions/trust boundaries change; add `developer-senior` only if this ticket matches the high‑risk list in §12.1).*

**Verify:** [Specific automated checks or manual smoke — tie to §8.]

---

Add **Prompt T2**, **Prompt T3**, … through **Prompt TN** using the same four parts (heading, body, **Skills to read first**, **Verify**). Align prompt IDs one-to-one with the §6.2 **Ticket** column.

### 12.3 Standard test commands

Use the **workspace package names and scripts** from the repo root `package.json` and CI config (`AGENTS.md` describes this repo as `apps/web` and `apps/api` — the value passed to `-w` / `--workspace` is the **workspace package `name`**, which may be a path like `apps/web` or a scoped name such as `@org/web` depending on how workspaces are declared).

1. `npm run ci:test:full` (or the repo-root script that mirrors CI)
2. `npm exec --workspace=<web-workspace> -- playwright install chromium webkit --with-deps` (when E2E applies)
3. `npm run test:e2e:ci -w <web-workspace>` (or the script name your repo uses)
4. `npm run test:e2e:mobile:smoke -w <web-workspace>` (when mobile-impacting UI changed)

If Playwright fails, attach report/trace artifacts to the PR or CI notes before requesting review.

### 12.4 Epic review and acceptance matrix

**Merge-ready expectation (non-trivial work):** green CI including coverage per **`AGENTS.md`**; **`developer-code-quality`** checklist complete; **`developer-senior`** applied where **Sr** is listed below or the §12.1 high-risk list matches; **`developer-quality-assurance`** satisfied where **QA** is listed or release/regression scope requires it.

| Epic   | Includes tickets | Primary reviewers | Epic done gate |
| ------ | ----------------- | ----------------- | -------------- |
| **E1** | T1, T2            | Sr, QA (add **Sec** when trust boundaries change); structural **code-quality** applies to all epics | [Concrete acceptance criteria — tests green, docs updated, etc.] |
| **E2** | […]               | […]               | […]            |


### 12.5 Manual test execution matrix

Automation cannot fully cover UX judgement, cross-account isolation, or flaky-network realism. Use this matrix for hands-on verification while preserving ticket traceability.


| Epic   | Manual test scenario | Related tickets | Steps to execute | Expected result | Sign-off   |
| ------ | -------------------- | --------------- | ---------------- | --------------- | ---------- |
| **E1** | [Scenario name]      | T1, T2          | [Numbered steps] | [Pass criteria] | [Name/Date] |


**Pre-review code quality (applies across epics):** before treating work as review-ready, read `.cursor/skills/developer-code-quality/SKILL.md` and address unnecessary nested control flow, duplicated logic, and unclear names where they would slow review. This complements manual scenarios, CI, and `developer-senior`; it does not replace them.

## 13. Revision history


| Version | Notes |
| ------- | ----- |
| 0.1     | Initial plan from template. |
| […]     | […]   |
